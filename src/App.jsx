
import React, { useState, useEffect, createContext, useContext } from 'react';

// --- RBAC RULES (ABSOLUTE MANDATE) ---
const RBAC_RULES = {
    'Business User': {
        dashboards: ['BusinessUserDashboard'],
        screens: ['RFQList', 'RFQDetail', 'RFQForm', 'OrderList', 'OrderDetail', 'TaskList', 'AuditLog', 'NotificationCenter'],
        actions: {
            'create_rfq': true,
            'view_rfq': true,
            'edit_rfq_draft': true,
            'submit_rfq': true,
            'cancel_rfq': true,
            'view_order': true,
            'view_task': true,
            'view_notification': true,
            'view_audit_log': true,
            'accept_quote': true,
            'initiate_po': true, // Can initiate, but Procurement Officer approves
        },
        data: {
            'rfq': { own: true, others: false },
            'order': { own: true, others: false },
            'supplier': { own: false, others: true },
            'audit': { own: true, others: false },
        }
    },
    'Procurement Officer': {
        dashboards: ['ProcurementOfficerDashboard'],
        screens: ['RFQList', 'RFQDetail', 'RFQForm', 'OrderList', 'OrderDetail', 'OrderForm', 'SupplierList', 'SupplierDetail', 'SupplierForm', 'TaskList', 'AuditLog', 'NotificationCenter'],
        actions: {
            'create_rfq': true,
            'view_rfq': true,
            'edit_rfq': true,
            'approve_rfq': true,
            'reject_rfq': true,
            'issue_po': true,
            'view_order': true,
            'edit_order': true,
            'mark_order_ready': true,
            'mark_order_delivered': true,
            'view_supplier': true,
            'onboard_supplier': true,
            'edit_supplier': true,
            'view_task': true,
            'view_notification': true,
            'view_audit_log': true,
            'manage_catalog': true,
        },
        data: {
            'rfq': { own: true, others: true },
            'order': { own: true, others: true },
            'supplier': { own: true, others: true },
            'audit': { own: true, others: true },
        }
    },
    'Supplier': {
        dashboards: [], // No explicit dashboard per input, a portal view
        screens: ['SupplierPortal', 'RFQDetail', 'OrderList', 'OrderDetail', 'SupplierDetail', 'SupplierForm', 'NotificationCenter'],
        actions: {
            'view_rfq': true,
            'submit_quote': true,
            'view_order': true,
            'update_order_status': true, // e.g., mark ready/delivered
            'view_supplier_profile': true,
            'edit_supplier_profile': true,
            'view_notification': true,
            'manage_catalog_items': true,
        },
        data: {
            'rfq': { own: false, others: true }, // Can see RFQs from others but only interact with those for them
            'order': { own: true, others: false },
            'supplier': { own: true, others: false },
            'audit': { own: false, others: false },
        }
    }
};

// --- STATUS MAPPINGS FOR COLORFUL CARDS (MANDATORY – NON-AI) ---
const STATUS_MAPS = {
    DRAFT: { label: 'Draft', category: 'grey', icon: '📝' },
    CREATED: { label: 'Created', category: 'blue', icon: '✨' },
    PENDING_APPROVAL: { label: 'Pending Approval', category: 'orange', icon: '⏳' },
    QUOTATION_RECEIVED: { label: 'Quotation Received', category: 'blue', icon: '✉️' },
    APPROVED: { label: 'Approved', category: 'green', icon: '✅' },
    REJECTED: { label: 'Rejected', category: 'red', icon: '❌' },
    PO_ISSUED: { label: 'PO Issued', category: 'blue', icon: '📄' },
    ACCEPTED: { label: 'Accepted by Supplier', category: 'blue', icon: '🤝' },
    IRONING: { label: 'In Production', category: 'blue', icon: '⚙️' },
    READY: { label: 'Ready for Delivery/Pickup', category: 'purple', icon: '📦' },
    DELIVERED: { label: 'Delivered', category: 'green', icon: '🚚' },
    CUSTOMER_PICKED: { label: 'Customer Picked Up', category: 'green', icon: '👋' },
    CANCELLED: { label: 'Cancelled', category: 'grey', icon: '🚫' },
    ONBOARDING: { label: 'Onboarding', category: 'blue', icon: ' onboarding' },
    ACTIVE: { label: 'Active', category: 'green', icon: '🟢' },
    INACTIVE: { label: 'Inactive', category: 'grey', icon: '⚫' },
    COMPLIANCE_ISSUE: { label: 'Compliance Issue', category: 'red', icon: '🚨' },
    ESCALATED: { label: 'Escalated', category: 'red', icon: '🔥' },
    PENDING_RESPONSE: { label: 'Pending Response', category: 'orange', icon: '💬' },
    QUOTE_SUBMITTED: { label: 'Quote Submitted', category: 'blue', icon: '⬆️' },
    COMPLETED: { label: 'Completed', category: 'green', icon: '✔️' },
};

// --- DUMMY DATA (MANDATORY – NO EMPTY STATES) ---
const DUMMY_DATA = {
    users: [
        { id: 'bu1', name: 'Alice Smith', role: 'Business User' },
        { id: 'po1', name: 'Bob Johnson', role: 'Procurement Officer' },
        { id: 's1', name: 'Widgets Inc.', role: 'Supplier' },
        { id: 's2', name: 'Innovate Solutions', role: 'Supplier' },
    ],
    rfqs: [
        {
            id: 'RFQ-001',
            title: 'Office Supplies Bulk Order',
            description: 'Procurement of general office stationery for Q3.',
            requestedBy: 'bu1',
            status: 'PENDING_APPROVAL',
            category: 'Office Supplies',
            requestedDate: '2023-10-26',
            dueDate: '2023-11-05',
            items: [
                { name: 'A4 Printer Paper', qty: 50, unit: 'reams' },
                { name: 'Black Ink Cartridges', qty: 10, unit: 'units' },
            ],
            quotes: [],
            workflowHistory: [
                { status: 'CREATED', date: '2023-10-26', by: 'Alice Smith' },
                { status: 'PENDING_APPROVAL', date: '2023-10-27', by: 'System' },
            ],
            relatedOrderId: null,
            assignedPO: 'po1',
        },
        {
            id: 'RFQ-002',
            title: 'New Server Rack Installation',
            description: 'Request for quotation for a new server rack and installation services.',
            requestedBy: 'bu1',
            status: 'APPROVED',
            category: 'IT Equipment',
            requestedDate: '2023-10-20',
            dueDate: '2023-11-10',
            items: [
                { name: '42U Server Rack', qty: 1, unit: 'unit' },
                { name: 'Installation Service', qty: 1, unit: 'service' },
            ],
            quotes: [{ supplierId: 's1', quoteAmount: 12500, status: 'SUBMITTED', submissionDate: '2023-10-25' }],
            workflowHistory: [
                { status: 'CREATED', date: '2023-10-20', by: 'Alice Smith' },
                { status: 'PENDING_APPROVAL', date: '2023-10-21', by: 'System' },
                { status: 'APPROVED', date: '2023-10-22', by: 'Bob Johnson' },
                { status: 'QUOTATION_RECEIVED', date: '2023-10-25', by: 'Widgets Inc.' },
            ],
            relatedOrderId: 'ORD-001',
            assignedPO: 'po1',
        },
        {
            id: 'RFQ-003',
            title: 'Custom Software Development',
            description: 'RFQ for a custom CRM module for sales team.',
            requestedBy: 'bu1',
            status: 'DRAFT',
            category: 'Software',
            requestedDate: '2023-11-01',
            dueDate: '2023-11-15',
            items: [
                { name: 'Discovery & Requirements', qty: 1, unit: 'phase' },
                { name: 'Development Sprints', qty: 3, unit: 'sprints' },
            ],
            quotes: [],
            workflowHistory: [
                { status: 'DRAFT', date: '2023-11-01', by: 'Alice Smith' },
            ],
            relatedOrderId: null,
            assignedPO: 'po1',
        },
        {
            id: 'RFQ-004',
            title: 'Marketing Material Printing',
            description: 'Printing of brochures and business cards for upcoming event.',
            requestedBy: 'bu1',
            status: 'REJECTED',
            category: 'Marketing',
            requestedDate: '2023-10-15',
            dueDate: '2023-10-25',
            items: [
                { name: 'A5 Brochures', qty: 500, unit: 'units' },
                { name: 'Business Cards', qty: 200, unit: 'units' },
            ],
            quotes: [],
            workflowHistory: [
                { status: 'CREATED', date: '2023-10-15', by: 'Alice Smith' },
                { status: 'PENDING_APPROVAL', date: '2023-10-16', by: 'System' },
                { status: 'REJECTED', date: '2023-10-17', by: 'Bob Johnson', reason: 'Budget constraints' },
            ],
            relatedOrderId: null,
            assignedPO: 'po1',
        },
        {
            id: 'RFQ-005',
            title: 'Facility Maintenance Services',
            description: 'Quarterly contract for office cleaning and minor repairs.',
            requestedBy: 'bu1',
            status: 'QUOTATION_RECEIVED',
            category: 'Facilities',
            requestedDate: '2023-10-28',
            dueDate: '2023-11-08',
            items: [{ name: 'Janitorial Service', qty: 1, unit: 'contract' }],
            quotes: [{ supplierId: 's2', quoteAmount: 3000, status: 'SUBMITTED', submissionDate: '2023-11-02' }],
            workflowHistory: [
                { status: 'CREATED', date: '2023-10-28', by: 'Alice Smith' },
                { status: 'PENDING_APPROVAL', date: '2023-10-29', by: 'System' },
                { status: 'APPROVED', date: '2023-10-30', by: 'Bob Johnson' },
                { status: 'QUOTATION_RECEIVED', date: '2023-11-02', by: 'Innovate Solutions' },
            ],
            relatedOrderId: null,
            assignedPO: 'po1',
        }
    ],
    orders: [
        {
            id: 'ORD-001',
            rfqId: 'RFQ-002',
            title: 'Server Rack & Installation',
            requestedBy: 'bu1',
            supplierId: 's1',
            status: 'IRONING',
            poNumber: 'PO-2023-001',
            orderDate: '2023-10-22',
            deliveryDate: '2023-11-15',
            price: 12500,
            currency: 'USD',
            deliveryOption: 'Supplier Delivery',
            items: [
                { name: '42U Server Rack', qty: 1, unit: 'unit' },
                { name: 'Installation Service', qty: 1, unit: 'service' },
            ],
            workflowHistory: [
                { status: 'PO_ISSUED', date: '2023-10-22', by: 'Bob Johnson' },
                { status: 'ACCEPTED', date: '2023-10-23', by: 'Widgets Inc.' },
                { status: 'IRONING', date: '2023-10-25', by: 'Widgets Inc.' },
            ],
            auditLogs: [
                { action: 'Order Status Changes', details: 'Status changed from PO_ISSUED to ACCEPTED', by: 'Widgets Inc.', date: '2023-10-23' },
                { action: 'Order Status Changes', details: 'Status changed from ACCEPTED to IRONING', by: 'Widgets Inc.', date: '2023-10-25' },
            ]
        },
        {
            id: 'ORD-002',
            rfqId: 'RFQ-005',
            title: 'Facility Maintenance Contract',
            requestedBy: 'bu1',
            supplierId: 's2',
            status: 'PENDING_APPROVAL', // PO to be issued
            poNumber: null,
            orderDate: '2023-11-03',
            deliveryDate: '2023-11-10',
            price: 3000,
            currency: 'USD',
            deliveryOption: 'Service Contract',
            items: [{ name: 'Janitorial Service', qty: 1, unit: 'contract' }],
            workflowHistory: [
                { status: 'QUOTATION_RECEIVED', date: '2023-11-02', by: 'Innovate Solutions' },
                { status: 'PENDING_APPROVAL', date: '2023-11-03', by: 'System (PO Review)' },
            ],
            auditLogs: [
                { action: 'Pricing Changes', details: 'Initial price of $3000 set based on quote', by: 'System', date: '2023-11-03' },
            ]
        },
        {
            id: 'ORD-003',
            rfqId: null,
            title: 'Ad-hoc Emergency Repair',
            requestedBy: 'po1', // Directly created by PO
            supplierId: 's1',
            status: 'READY',
            poNumber: 'PO-2023-002',
            orderDate: '2023-10-30',
            deliveryDate: '2023-11-02',
            price: 500,
            currency: 'USD',
            deliveryOption: 'Customer Picked',
            items: [{ name: 'Emergency HVAC Filter', qty: 2, unit: 'units' }],
            workflowHistory: [
                { status: 'PO_ISSUED', date: '2023-10-30', by: 'Bob Johnson' },
                { status: 'ACCEPTED', date: '2023-10-30', by: 'Widgets Inc.' },
                { status: 'IRONING', date: '2023-10-31', by: 'Widgets Inc.' },
                { status: 'READY', date: '2023-11-01', by: 'Widgets Inc.' },
            ],
            auditLogs: [
                { action: 'Order Status Changes', details: 'Status changed to READY for pickup', by: 'Widgets Inc.', date: '2023-11-01' },
                { action: 'Delivery Option', details: 'Changed to Customer Picked', by: 'Bob Johnson', date: '2023-10-30' },
            ]
        },
        {
            id: 'ORD-004',
            rfqId: null,
            title: 'Quarterly Stationery Stock',
            requestedBy: 'bu1',
            supplierId: 's2',
            status: 'DELIVERED',
            poNumber: 'PO-2023-003',
            orderDate: '2023-09-10',
            deliveryDate: '2023-09-15',
            price: 850,
            currency: 'USD',
            deliveryOption: 'Supplier Delivery',
            items: [
                { name: 'Pens (Box of 100)', qty: 5, unit: 'boxes' },
                { name: 'Notebooks (A5)', qty: 20, unit: 'units' },
            ],
            workflowHistory: [
                { status: 'PO_ISSUED', date: '2023-09-10', by: 'Bob Johnson' },
                { status: 'ACCEPTED', date: '2023-09-11', by: 'Innovate Solutions' },
                { status: 'IRONING', date: '2023-09-12', by: 'Innovate Solutions' },
                { status: 'READY', date: '2023-09-14', by: 'Innovate Solutions' },
                { status: 'DELIVERED', date: '2023-09-15', by: 'Innovate Solutions' },
            ],
            auditLogs: [
                { action: 'Order Status Changes', details: 'Status changed to DELIVERED', by: 'Innovate Solutions', date: '2023-09-15' },
            ]
        },
        {
            id: 'ORD-005',
            rfqId: null,
            title: 'Consulting Services Contract',
            requestedBy: 'po1',
            supplierId: 's2',
            status: 'COMPLETED',
            poNumber: 'PO-2023-004',
            orderDate: '2023-08-01',
            deliveryDate: '2023-08-31',
            price: 15000,
            currency: 'USD',
            deliveryOption: 'Service Contract',
            items: [{ name: 'Project Management Consulting', qty: 1, unit: 'month' }],
            workflowHistory: [
                { status: 'PO_ISSUED', date: '2023-08-01', by: 'Bob Johnson' },
                { status: 'ACCEPTED', date: '2023-08-02', by: 'Innovate Solutions' },
                { status: 'IRONING', date: '2023-08-05', by: 'Innovate Solutions' },
                { status: 'COMPLETED', date: '2023-08-31', by: 'Innovate Solutions' },
            ],
            auditLogs: [
                { action: 'Order Status Changes', details: 'Status changed to COMPLETED', by: 'Innovate Solutions', date: '2023-08-31' },
            ]
        }
    ],
    suppliers: [
        {
            id: 's1',
            name: 'Widgets Inc.',
            status: 'ACTIVE',
            contactPerson: 'John Doe',
            email: 'john.doe@widgetsinc.com',
            phone: '555-123-4567',
            address: '123 Widget Way, Tech City',
            registrationDate: '2022-01-15',
            lastActivity: '2023-11-02',
            compliance: 'Compliant',
            documents: ['Business License.pdf', 'Tax ID.pdf'],
        },
        {
            id: 's2',
            name: 'Innovate Solutions',
            status: 'ACTIVE',
            contactPerson: 'Jane Smith',
            email: 'jane.smith@innovatesolutions.com',
            phone: '555-987-6543',
            address: '456 Innovation Blvd, Startup Town',
            registrationDate: '2022-03-20',
            lastActivity: '2023-11-01',
            compliance: 'Compliant',
            documents: ['Company Profile.pdf', 'Insurance.pdf'],
        },
        {
            id: 's3',
            name: 'Global Supply Co.',
            status: 'ONBOARDING',
            contactPerson: 'Michael Brown',
            email: 'michael.brown@globalsupply.com',
            phone: '555-555-1111',
            address: '789 Supply Chain Rd, Logistics Hub',
            registrationDate: '2023-10-01',
            lastActivity: '2023-10-15',
            compliance: 'Pending Documents',
            documents: ['Application Form.pdf'],
        },
        {
            id: 's4',
            name: 'Eco-Friendly Products',
            status: 'INACTIVE',
            contactPerson: 'Emily White',
            email: 'emily.white@ecofriendly.com',
            phone: '555-333-2222',
            address: '101 Green St, Eco Village',
            registrationDate: '2021-06-01',
            lastActivity: '2022-05-10',
            compliance: 'Expired Certifications',
            documents: ['Eco Cert.pdf'],
        },
        {
            id: 's5',
            name: 'Local Builders Ltd.',
            status: 'ACTIVE',
            contactPerson: 'David Green',
            email: 'david.green@localbuilders.com',
            phone: '555-444-3333',
            address: '202 Construction Way, Buildsville',
            registrationDate: '2023-01-01',
            lastActivity: '2023-09-20',
            compliance: 'Compliant',
            documents: ['Contract.pdf'],
        }
    ],
    tasks: [
        { id: 'T-001', type: 'RFQ Approval', title: 'Approve RFQ-001', assignedTo: 'po1', dueDate: '2023-11-03', status: 'PENDING', entityId: 'RFQ-001', entityType: 'RFQ' },
        { id: 'T-002', type: 'Submit Quote', title: 'Submit Quote for RFQ-005', assignedTo: 's2', dueDate: '2023-11-05', status: 'PENDING', entityId: 'RFQ-005', entityType: 'RFQ' },
        { id: 'T-003', type: 'PO Issue', title: 'Issue PO for RFQ-005', assignedTo: 'po1', dueDate: '2023-11-04', status: 'COMPLETED', entityId: 'ORD-002', entityType: 'Order' },
        { id: 'T-004', type: 'Supplier Onboarding', title: 'Review Supplier S3 documents', assignedTo: 'po1', dueDate: '2023-11-06', status: 'PENDING', entityId: 's3', entityType: 'Supplier' },
        { id: 'T-005', type: 'RFQ Revision', title: 'Revise RFQ-003 details', assignedTo: 'bu1', dueDate: '2023-11-08', status: 'PENDING', entityId: 'RFQ-003', entityType: 'RFQ' },
        { id: 'T-006', type: 'Update Order Status', title: 'Mark ORD-001 as Ready', assignedTo: 's1', dueDate: '2023-11-10', status: 'PENDING', entityId: 'ORD-001', entityType: 'Order' },
    ],
    notifications: [
        { id: 'N-001', userId: 'bu1', message: 'Your RFQ-001 is pending approval by Procurement.', type: 'info', read: false, date: '2023-11-02T10:00:00Z' },
        { id: 'N-002', userId: 'po1', message: 'New RFQ-001 requires your approval.', type: 'warning', read: false, date: '2023-11-02T10:05:00Z' },
        { id: 'N-003', userId: 's2', message: 'RFQ-005 requires a quote from Innovate Solutions.', type: 'warning', read: false, date: '2023-11-02T10:10:00Z' },
        { id: 'N-004', userId: 'bu1', message: 'RFQ-002 has been approved and PO-2023-001 issued.', type: 'success', read: true, date: '2023-10-22T14:30:00Z' },
        { id: 'N-005', userId: 's1', message: 'Order ORD-001 status updated to IRONING.', type: 'info', read: true, date: '2023-10-25T09:00:00Z' },
        { id: 'N-006', userId: 'po1', message: 'Supplier S3 onboarding documents are pending review.', type: 'error', read: false, date: '2023-11-01T16:00:00Z' },
        { id: 'N-007', userId: 'bu1', message: 'Your RFQ-004 was rejected due to budget constraints.', type: 'error', read: false, date: '2023-10-17T11:00:00Z' },
        { id: 'N-008', userId: 's1', message: 'Order ORD-003 is READY for customer pickup.', type: 'success', read: false, date: '2023-11-01T15:00:00Z' },
    ],
    auditLogs: [
        { id: 'AL-001', entityType: 'RFQ', entityId: 'RFQ-001', action: 'Status Changed', details: 'Status updated to PENDING_APPROVAL', by: 'Alice Smith', role: 'Business User', date: '2023-10-27T10:00:00Z' },
        { id: 'AL-002', entityType: 'RFQ', entityId: 'RFQ-002', action: 'Approved', details: 'RFQ approved, PO can be issued', by: 'Bob Johnson', role: 'Procurement Officer', date: '2023-10-22T14:00:00Z' },
        { id: 'AL-003', entityType: 'Order', entityId: 'ORD-001', action: 'Order Status Changes', details: 'Status changed from PO_ISSUED to ACCEPTED', by: 'Widgets Inc.', role: 'Supplier', date: '2023-10-23T09:00:00Z' },
        { id: 'AL-004', entityType: 'Order', entityId: 'ORD-001', action: 'Delivery Option', details: 'Delivery option confirmed as Supplier Delivery', by: 'Widgets Inc.', role: 'Supplier', date: '2023-10-23T09:15:00Z' },
        { id: 'AL-005', entityType: 'Supplier', entityId: 's3', action: 'Supplier Onboarding Started', details: 'New supplier registration initiated', by: 'Bob Johnson', role: 'Procurement Officer', date: '2023-10-01T11:00:00Z' },
        { id: 'AL-006', entityType: 'RFQ', entityId: 'RFQ-004', action: 'Rejected', details: 'RFQ rejected due to budget constraints', by: 'Bob Johnson', role: 'Procurement Officer', date: '2023-10-17T11:00:00Z' },
        { id: 'AL-007', entityType: 'Order', entityId: 'ORD-003', action: 'Order Status Changes', details: 'Status changed to READY for pickup', by: 'Widgets Inc.', role: 'Supplier', date: '2023-11-01T15:00:00Z' },
    ]
};

// --- Contexts for Global State (User, Theme, Toasts) ---
const AuthContext = createContext(null);
const ToastContext = createContext(null);

const useAuth = () => useContext(AuthContext);
const useToast = () => useContext(ToastContext);

// --- Reusable Components ---

const Icon = ({ name, className = '' }) => <span className={`icon ${className}`}>{name}</span>;

const StatusBadge = ({ status }) => {
    const statusInfo = STATUS_MAPS[status] || { label: status, category: 'grey' };
    return (
        <span className={`status-badge ${statusInfo.category}`}>
            {statusInfo.icon} {statusInfo.label}
        </span>
    );
};

const ActionButton = ({ onClick, label, className = 'button-primary', disabled = false, icon }) => {
    return (
        <button onClick={onClick} className={`button ${className}`} disabled={disabled}>
            {icon && <Icon name={icon} />}
            {label}
        </button>
    );
};

const Card = ({ title, status, onClick, children, className = '', footerContent, headerActions }) => {
    const statusInfo = STATUS_MAPS[status] || STATUS_MAPS.DRAFT;
    return (
        <div className={`card card-colorful ${className}`} data-status-category={statusInfo.category} onClick={onClick}>
            <div className="card-header">
                {title}
                <div className="card-header-actions">
                    {headerActions}
                </div>
            </div>
            <div className="card-body">
                {children}
            </div>
            {footerContent && (
                <div className="card-footer">
                    {footerContent}
                </div>
            )}
        </div>
    );
};

const ToastNotification = ({ id, message, type, onDismiss }) => {
    const iconMap = {
        info: 'ℹ️',
        success: '✔️',
        warning: '⚠️',
        error: '🚨',
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, 5000); // Auto-dismiss after 5 seconds
        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    return (
        <div className={`toast ${type}`}>
            <Icon name={iconMap[type]} className="toast-icon" />
            <span>{message}</span>
        </div>
    );
};

const WorkflowStepper = ({ history, currentStatus }) => {
    const milestones = [
        'CREATED', 'PENDING_APPROVAL', 'APPROVED', 'QUOTATION_RECEIVED', 'PO_ISSUED',
        'ACCEPTED', 'IRONING', 'READY', 'DELIVERED', 'CUSTOMER_PICKED', 'COMPLETED'
    ];

    return (
        <div className="workflow-stepper">
            {milestones.map((milestone, index) => {
                const stepHistory = history.find(h => h.status === milestone);
                const isCompleted = !!stepHistory && history.findIndex(h => h.status === milestone) <= history.findIndex(h => h.status === currentStatus);
                const isCurrent = milestone === currentStatus;
                const statusInfo = STATUS_MAPS[milestone];

                // Example SLA tracking (simplified)
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 5); // Dummy due date for example
                const isSlaWarning = isCurrent && new Date() > new Date(dueDate.setDate(dueDate.getDate() - 2));
                const isSlaBreached = isCurrent && new Date() > dueDate;

                return (
                    <div
                        key={milestone}
                        className={`workflow-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                    >
                        <div className="workflow-step-content">
                            <h4>{statusInfo?.label || milestone}</h4>
                            {stepHistory && <p>Completed by {stepHistory.by} on {new Date(stepHistory.date).toLocaleDateString()}</p>}
                            {isCurrent && !stepHistory && <p>Currently in this stage.</p>}
                            {isCurrent && <span className={`sla-badge ${isSlaBreached ? 'breached' : (isSlaWarning ? 'warning' : 'on-track')}`}>
                                {isSlaBreached ? 'SLA BREACHED' : (isSlaWarning ? 'SLA Warning' : 'On Track')}
                            </span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Form Generator (Mandatory) ---
const FormRenderer = ({ formSchema, formData, onChange, onSubmit, onCancel, readOnly = false }) => {
    const { currentUser, canAccess } = useAuth();
    const { addToast } = useToast();

    const [formErrors, setFormErrors] = useState({});

    const validateField = (field, value) => {
        if (field.mandatory && !value) {
            return `${field.label} is mandatory.`;
        }
        // Add more specific validations here (e.g., email format, number range)
        return null;
    };

    const validateForm = () => {
        let errors = {};
        formSchema.sections.forEach(section => {
            section.fields.forEach(field => {
                const error = validateField(field, formData[field.name]);
                if (error) {
                    errors[field.name] = error;
                }
            });
        });
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit();
            addToast('Form submitted successfully!', 'success');
        } else {
            addToast('Please correct the form errors.', 'error');
        }
    };

    const [expandedSections, setExpandedSections] = useState(formSchema.sections.map(s => s.name));
    const toggleSection = (sectionName) => {
        setExpandedSections(prev =>
            prev.includes(sectionName)
                ? prev.filter(name => name !== sectionName)
                : [...prev, sectionName]
        );
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit}>
                {formSchema.sections.map(section => (
                    <div className="accordion-section" key={section.name}>
                        <div
                            className={`accordion-header ${expandedSections.includes(section.name) ? 'expanded' : ''}`}
                            onClick={() => toggleSection(section.name)}
                        >
                            <h3>{section.title}</h3>
                            <Icon name={expandedSections.includes(section.name) ? '▶️' : '🔽'} />
                        </div>
                        <div className={`accordion-content ${expandedSections.includes(section.name) ? 'expanded' : ''}`}>
                            {section.fields.map(field => {
                                // Field-level security & visibility
                                if (field.roles && !field.roles.includes(currentUser?.role)) return null;
                                if (field.readOnlyRoles && field.readOnlyRoles.includes(currentUser?.role) && !readOnly) {
                                    return (
                                        <div className="form-field" key={field.name}>
                                            <label>{field.label}</label>
                                            <input type="text" value={formData[field.name] || ''} readOnly disabled />
                                        </div>
                                    );
                                }

                                return (
                                    <div className="form-field" key={field.name}>
                                        <label>{field.label} {field.mandatory && <span style={{ color: 'var(--status-red)' }}>*</span>}</label>
                                        {field.type === 'text' || field.type === 'number' || field.type === 'date' ? (
                                            <input
                                                type={field.type}
                                                name={field.name}
                                                value={formData[field.name] || ''}
                                                onChange={(e) => onChange(field.name, e.target.value)}
                                                readOnly={readOnly}
                                                disabled={readOnly}
                                            />
                                        ) : field.type === 'textarea' ? (
                                            <textarea
                                                name={field.name}
                                                value={formData[field.name] || ''}
                                                onChange={(e) => onChange(field.name, e.target.value)}
                                                readOnly={readOnly}
                                                disabled={readOnly}
                                            />
                                        ) : field.type === 'select' ? (
                                            <select
                                                name={field.name}
                                                value={formData[field.name] || ''}
                                                onChange={(e) => onChange(field.name, e.target.value)}
                                                readOnly={readOnly}
                                                disabled={readOnly}
                                            >
                                                <option value="">Select...</option>
                                                {field.options.map(option => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'file' ? (
                                            <input type="file" name={field.name} onChange={(e) => onChange(field.name, e.target.files[0])} disabled={readOnly} />
                                        ) : null}
                                        {formErrors[field.name] && <p className="form-validation-error">{formErrors[field.name]}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {!readOnly && (
                    <div className="form-actions">
                        <ActionButton label="Cancel" onClick={onCancel} className="button-secondary" type="button" />
                        <ActionButton label="Save" onClick={onSubmit} className="button-primary" type="submit" />
                    </div>
                )}
            </form>
        </div>
    );
};


// --- Screens (FULL-SCREEN NAVIGATION ONLY) ---

const LoginScreen = ({ onLogin }) => {
    return (
        <div className="full-screen-page" style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--color-primary-dark)' }}>
            <div className="card" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', maxWidth: '400px', backgroundColor: 'var(--bg-card-light)' }}>
                <h2>Welcome to TailSpend Management</h2>
                <p>Select your persona to continue:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                    {DUMMY_DATA.users.map(user => (
                        <ActionButton key={user.id} label={`${user.name} (${user.role})`} onClick={() => onLogin(user)} className="button-primary" />
                    ))}
                </div>
            </div>
        </div>
    );
};

const DashboardScreen = ({ currentUser, navigate }) => {
    const { canAccess } = useAuth();
    const { addToast } = useToast();

    // Filter data for the current user/role
    const userRFQs = DUMMY_DATA.rfqs.filter(rfq => rfq.requestedBy === currentUser.id);
    const userOrders = DUMMY_DATA.orders.filter(order => order.requestedBy === currentUser.id);
    const userTasks = DUMMY_DATA.tasks.filter(task => task.assignedTo === currentUser.id && task.status === 'PENDING');
    const userNotifications = DUMMY_DATA.notifications.filter(n => n.userId === currentUser.id && !n.read);
    const userAuditLogs = DUMMY_DATA.auditLogs.filter(log => log.by === currentUser.name || log.role === currentUser.role);

    // KPIs for Business User
    const buKPIs = [
        { title: 'My RFQs in Progress', value: userRFQs.filter(r => ['CREATED', 'PENDING_APPROVAL', 'QUOTATION_RECEIVED']).length, icon: '🚀' },
        { title: 'My Orders Awaiting PO', value: userRFQs.filter(r => r.status === 'APPROVED').length, icon: '✉️' },
        { title: 'Pending Supplier Quotes', value: userRFQs.filter(r => r.status === 'QUOTATION_RECEIVED').length, icon: '💬' },
        { title: 'Completed Purchases', value: userOrders.filter(o => ['DELIVERED', 'CUSTOMER_PICKED', 'COMPLETED']).length, icon: '✅' },
    ];

    // KPIs for Procurement Officer
    const poKPIs = [
        { title: 'Open RFQs for Review', value: DUMMY_DATA.rfqs.filter(r => r.status === 'PENDING_APPROVAL').length, icon: '👀' },
        { title: 'Orders Pending PO Issue', value: DUMMY_DATA.orders.filter(o => o.status === 'PENDING_APPROVAL').length, icon: '✍️' },
        { title: 'Suppliers Onboarding', value: DUMMY_DATA.suppliers.filter(s => s.status === 'ONBOARDING').length, icon: '🤝' },
        { title: 'SLA Breaches (last 7 days)', value: DUMMY_DATA.tasks.filter(t => t.status === 'PENDING' && new Date(t.dueDate) < new Date()).length, icon: '🚨' },
    ];

    const currentKPIs = currentUser.role === 'Business User' ? buKPIs : (currentUser.role === 'Procurement Officer' ? poKPIs : []);

    const recentActivities = currentUser.role === 'Business User'
        ? DUMMY_DATA.rfqs.filter(r => r.requestedBy === currentUser.id).slice(0, 5).map(r => ({
            id: r.id,
            action: `RFQ ${r.status.toLowerCase().replace('_', ' ')}: ${r.title}`,
            status: r.status,
            date: r.workflowHistory[r.workflowHistory.length - 1]?.date || r.requestedDate,
            type: 'RFQ',
            entityId: r.id
        }))
        : (currentUser.role === 'Procurement Officer'
            ? DUMMY_DATA.auditLogs.filter(log => log.role === 'Procurement Officer' || log.entityId === 's3' || DUMMY_DATA.rfqs.some(r => r.id === log.entityId && r.assignedPO === currentUser.id)).slice(0, 5).map(log => ({
                id: log.id,
                action: `${log.entityType} ${log.action}: ${log.details}`,
                status: STATUS_MAPS[log.action.split(' ')[0]]?.category || 'grey', // simplified status
                date: log.date,
                type: log.entityType,
                entityId: log.entityId
            }))
            : []
        );

    // Upcoming Deadlines (simple aggregation from tasks and RFQs)
    const upcomingDeadlines = DUMMY_DATA.tasks
        .filter(task => task.assignedTo === currentUser.id && task.status === 'PENDING')
        .map(task => ({
            id: task.id,
            title: task.title,
            dueDate: task.dueDate,
            type: task.entityType,
            entityId: task.entityId,
            status: 'PENDING'
        }))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5); // Show top 5 nearest deadlines

    if (!canAccess('dashboards', currentUser.role + 'Dashboard')) {
        return <div className="full-screen-page page-content">
            <h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2>
            <p>You do not have access to this dashboard.</p>
        </div>;
    }

    // Dummy chart data (would be a real chart library)
    const chartData = [
        { label: 'Q1', value: 100 }, { label: 'Q2', value: 120 },
        { label: 'Q3', value: 90 }, { label: 'Q4', value: 150 }
    ];

    const ChartPlaceholder = ({ title }) => (
        <div className="card" onClick={() => addToast('Chart interactions not implemented in prototype', 'info')} style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-secondary-bg))' }}>
            <h3 style={{ color: 'var(--color-primary-dark)' }}>{title} Chart Placeholder</h3>
            <p style={{ position: 'absolute', bottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>Click to animate (mock)</p>
        </div>
    );

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>{currentUser.role} Dashboard</h2>
                <div className="section-actions">
                    <ActionButton label="Export" onClick={() => addToast('Export functionality (PDF/Excel) mocked', 'info')} className="button-secondary" icon="📄" />
                </div>
            </div>
            <div className="page-content">
                <section>
                    <div className="dashboard-grid">
                        {currentKPIs.map(kpi => (
                            <div className="kpi-card" key={kpi.title} onClick={() => addToast(`KPI drill-down for "${kpi.title}" mocked`, 'info')}>
                                <Icon name={kpi.icon} className="kpi-icon" />
                                <div className="kpi-value">{kpi.value}</div>
                                <div className="kpi-title">{kpi.title}</div>
                                <div className="kpi-footer">
                                    <span>Real-time</span>
                                    <span className="trend-indicator up">▲ 5%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                    <ChartPlaceholder title="Real-time Spend Trends" />
                    <ChartPlaceholder title="Historical Savings" />
                </section>

                <section className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="card" style={{ cursor: 'default' }}>
                        <div className="card-header" style={{ backgroundColor: 'var(--color-primary)' }}>Recent Activities</div>
                        <div className="card-body">
                            {recentActivities.length > 0 ? (
                                recentActivities.map(activity => (
                                    <div key={activity.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate(`${activity.type}Detail`, activity.entityId, activity.type)}>
                                        <p style={{ margin: 0, color: 'var(--text-color-dark)' }}>
                                            <strong>{STATUS_MAPS[activity.status]?.icon || ''} {activity.action}</strong>
                                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)', marginLeft: 'var(--spacing-sm)' }}>
                                                {new Date(activity.date).toLocaleString()}
                                            </span>
                                        </p>
                                        <Icon name="➡️" />
                                    </div>
                                ))
                            ) : (
                                <p>No recent activities.</p>
                            )}
                        </div>
                        <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
                            <ActionButton label="View All Audit" onClick={() => navigate('AuditLog')} className="button-ghost" icon="📜" />
                        </div>
                    </div>

                    <div className="card" style={{ cursor: 'default' }}>
                        <div className="card-header" style={{ backgroundColor: 'var(--color-primary)' }}>Task / Work Queue</div>
                        <div className="card-body">
                            {userTasks.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {userTasks.map(task => (
                                        <li key={task.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate(`${task.entityType}Detail`, task.entityId, task.entityType)}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color-dark)' }}>{task.title}</p>
                                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}>Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                                            </div>
                                            <StatusBadge status={task.status} />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No pending tasks.</p>
                            )}
                        </div>
                        <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
                            <ActionButton label="View All Tasks" onClick={() => navigate('TaskList')} className="button-ghost" icon="📋" />
                        </div>
                    </div>

                    <div className="card" style={{ cursor: 'default' }}>
                        <div className="card-header" style={{ backgroundColor: 'var(--color-secondary)' }}>Upcoming Deadlines</div>
                        <div className="card-body">
                            {upcomingDeadlines.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {upcomingDeadlines.map(deadline => (
                                        <li key={deadline.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate(`${deadline.type}Detail`, deadline.entityId, deadline.type)}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color-dark)' }}>{deadline.title}</p>
                                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}>{new Date(deadline.dueDate).toLocaleDateString()}</p>
                                            </div>
                                            <StatusBadge status={deadline.status} />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No upcoming deadlines.</p>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ cursor: 'default' }}>
                        <div className="card-header" style={{ backgroundColor: 'var(--color-accent)' }}>Notifications</div>
                        <div className="card-body">
                            {userNotifications.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {userNotifications.slice(0, 5).map(notif => (
                                        <li key={notif.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center' }} onClick={() => addToast(`Marked notification ${notif.id} as read.`, 'info')}>
                                            <Icon name={STATUS_MAPS[notif.type.toUpperCase()]?.icon || '🔔'} style={{ marginRight: 'var(--spacing-sm)', color: 'var(--color-accent)' }} />
                                            <p style={{ margin: 0, flexGrow: 1, color: 'var(--text-color-dark)' }}>{notif.message}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No new notifications.</p>
                            )}
                        </div>
                        <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
                            <ActionButton label="View All Notifications" onClick={() => navigate('NotificationCenter')} className="button-ghost" icon="🔔" />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

const RFQListScreen = ({ navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState('requestedDate');

    if (!canAccess('screens', 'RFQList')) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to view RFQs.</p></div>;
    }

    let filteredRFQs = DUMMY_DATA.rfqs;

    // RBAC: Business User only sees their own RFQs
    if (currentUser.role === 'Business User') {
        filteredRFQs = filteredRFQs.filter(rfq => rfq.requestedBy === currentUser.id);
    }

    if (filter) {
        filteredRFQs = filteredRFQs.filter(rfq =>
            rfq.title.toLowerCase().includes(filter.toLowerCase()) ||
            rfq.id.toLowerCase().includes(filter.toLowerCase()) ||
            rfq.status.toLowerCase().includes(filter.toLowerCase())
        );
    }

    filteredRFQs.sort((a, b) => {
        if (sort === 'requestedDate') return new Date(b.requestedDate) - new Date(a.requestedDate);
        if (sort === 'dueDate') return new Date(b.dueDate) - new Date(a.dueDate);
        if (sort === 'status') return a.status.localeCompare(b.status);
        return 0;
    });

    const createRFQ = () => navigate('RFQForm', 'new');

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>RFQ List</h2>
                <div className="global-search-container" style={{ flexGrow: 1, maxWidth: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search RFQs..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="global-search-input"
                    />
                </div>
                <div className="section-actions">
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className="global-search-input" style={{ width: 'auto' }}>
                        <option value="requestedDate">Sort by Date</option>
                        <option value="dueDate">Sort by Due Date</option>
                        <option value="status">Sort by Status</option>
                    </select>
                    {canAccess('actions', 'create_rfq') && <ActionButton label="Create New RFQ" onClick={createRFQ} icon="➕" />}
                    <ActionButton label="Export" onClick={() => {}} className="button-secondary" icon="📄" />
                </div>
            </div>
            <div className="page-content">
                {filteredRFQs.length === 0 ? (
                    <div className="empty-state">
                        <Icon name="🔍" />
                        <p>No RFQs found. Try adjusting your filters or create a new one!</p>
                        {canAccess('actions', 'create_rfq') && <ActionButton label="Create New RFQ" onClick={createRFQ} icon="➕" />}
                    </div>
                ) : (
                    <div className="card-grid">
                        {filteredRFQs.map(rfq => (
                            <Card
                                key={rfq.id}
                                title={`${rfq.id}: ${rfq.title}`}
                                status={rfq.status}
                                onClick={() => navigate('RFQDetail', rfq.id, 'RFQ')}
                                footerContent={
                                    <>
                                        <span>Req. Date: {rfq.requestedDate}</span>
                                        <span>Due Date: {rfq.dueDate}</span>
                                    </>
                                }
                            >
                                <p style={{ color: 'var(--text-color-dark)', margin: '0 0 var(--spacing-sm) 0' }}>{rfq.description.substring(0, 70)}...</p>
                                <p style={{ margin: 0 }}><StatusBadge status={rfq.status} /></p>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const RFQDetailScreen = ({ rfqId, navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const { addToast } = useToast();
    const rfq = DUMMY_DATA.rfqs.find(r => r.id === rfqId);

    if (!rfq || (currentUser.role === 'Business User' && rfq.requestedBy !== currentUser.id)) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>RFQ Not Found or Access Denied</h2></div>;
    }
    if (!canAccess('screens', 'RFQDetail')) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to view RFQ details.</p></div>;
    }

    const handleAction = (action, rfqToUpdate) => {
        addToast(`Action "${action}" on RFQ ${rfqToUpdate.id} mocked`, 'info');
        // In a real app, this would dispatch an action to update global state/API
        const updatedRfq = { ...rfqToUpdate };
        const newStatus = action === 'approve_rfq' ? 'APPROVED' :
                          action === 'reject_rfq' ? 'REJECTED' :
                          action === 'submit_quote' ? 'QUOTATION_RECEIVED' :
                          action === 'edit_rfq' ? rfqToUpdate.status : // Status doesn't change on edit itself
                          rfqToUpdate.status;

        updatedRfq.status = newStatus;
        updatedRfq.workflowHistory.push({ status: newStatus, date: new Date().toISOString().split('T')[0], by: currentUser.name });

        // Simulate update in DUMMY_DATA (NOT for production, just for prototype state change)
        const rfqIndex = DUMMY_DATA.rfqs.findIndex(r => r.id === rfqToUpdate.id);
        if (rfqIndex !== -1) {
            DUMMY_DATA.rfqs[rfqIndex] = updatedRfq;
        }

        // If approved, create a pending order
        if (action === 'approve_rfq') {
            const newOrderId = `ORD-00${DUMMY_DATA.orders.length + 1}`;
            DUMMY_DATA.orders.push({
                id: newOrderId,
                rfqId: rfqToUpdate.id,
                title: rfqToUpdate.title,
                requestedBy: rfqToUpdate.requestedBy,
                supplierId: rfqToUpdate.quotes[0]?.supplierId || 'unknown', // Assume first quote if any
                status: 'PENDING_APPROVAL', // Pending PO issuance
                poNumber: null,
                orderDate: new Date().toISOString().split('T')[0],
                deliveryDate: null,
                price: rfqToUpdate.quotes[0]?.quoteAmount || 0,
                currency: 'USD',
                deliveryOption: null,
                items: rfqToUpdate.items,
                workflowHistory: [{ status: 'PENDING_APPROVAL', date: new Date().toISOString().split('T')[0], by: 'System (PO Review)' }],
                auditLogs: []
            });
            updatedRfq.relatedOrderId = newOrderId;
        }

        navigate(newStatus === 'APPROVED' ? 'OrderList' : 'RFQList'); // Redirect or refresh
    };

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>RFQ Details: {rfq.id}</h2>
                <div className="section-actions">
                    {rfq.status === 'DRAFT' && canAccess('actions', 'edit_rfq_draft') && (
                        <ActionButton label="Edit RFQ" onClick={() => navigate('RFQForm', rfq.id, 'RFQ')} icon="✏️" />
                    )}
                    {rfq.status === 'PENDING_APPROVAL' && currentUser.role === 'Procurement Officer' && canAccess('actions', 'approve_rfq') && (
                        <>
                            <ActionButton label="Approve RFQ" onClick={() => handleAction('approve_rfq', rfq)} className="button-primary" icon="✅" />
                            <ActionButton label="Reject RFQ" onClick={() => handleAction('reject_rfq', rfq)} className="button-danger" icon="❌" />
                        </>
                    )}
                    {rfq.status === 'APPROVED' && currentUser.role === 'Supplier' && canAccess('actions', 'submit_quote') && (
                        <ActionButton label="Submit Quote" onClick={() => addToast('Submit Quote form mocked', 'info')} className="button-primary" icon="✉️" />
                    )}
                    {canAccess('actions', 'initiate_po') && rfq.status === 'APPROVED' && currentUser.role === 'Business User' && (
                        <ActionButton label="Initiate PO (PO Review)" onClick={() => handleAction('approve_rfq', rfq)} className="button-secondary" icon="✍️" />
                    )}
                    {rfq.relatedOrderId && canAccess('screens', 'OrderDetail') && (
                        <ActionButton label="View Related Order" onClick={() => navigate('OrderDetail', rfq.relatedOrderId, 'Order')} className="button-secondary" icon="🔗" />
                    )}
                </div>
            </div>
            <div className="page-content">
                <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        <Card title="RFQ Overview" status={rfq.status} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                            <p><strong>Title:</strong> {rfq.title}</p>
                            <p><strong>Description:</strong> {rfq.description}</p>
                            <p><strong>Category:</strong> {rfq.category}</p>
                            <p><strong>Requested By:</strong> {DUMMY_DATA.users.find(u => u.id === rfq.requestedBy)?.name}</p>
                            <p><strong>Requested Date:</strong> {rfq.requestedDate}</p>
                            <p><strong>Due Date:</strong> {rfq.dueDate}</p>
                            <p><strong>Current Status:</strong> <StatusBadge status={rfq.status} /></p>
                        </Card>
                        <Card title="Requested Items" status={rfq.status} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {rfq.items.map((item, index) => (
                                    <li key={index} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0', borderBottom: '1px dotted var(--border-light)' }}>
                                        {item.qty} {item.unit} of {item.name}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                        {rfq.quotes && rfq.quotes.length > 0 && (
                             <Card title="Supplier Quotes" status={rfq.status} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {rfq.quotes.map((quote, index) => {
                                        const supplier = DUMMY_DATA.suppliers.find(s => s.id === quote.supplierId);
                                        return (
                                            <li key={index} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0', borderBottom: '1px dotted var(--border-light)' }}>
                                                <p><strong>Supplier:</strong> {supplier?.name || quote.supplierId}</p>
                                                <p><strong>Amount:</strong> ${quote.quoteAmount} {rfq.currency || 'USD'}</p>
                                                <p><strong>Status:</strong> <StatusBadge status={quote.status} /></p>
                                                {canAccess('actions', 'accept_quote') && rfq.status === 'QUOTATION_RECEIVED' && (
                                                    <ActionButton label="Accept Quote" onClick={() => addToast(`Accepted quote from ${supplier?.name}`, 'success')} className="button-primary" style={{ marginTop: 'var(--spacing-sm)' }} />
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Card>
                        )}
                    </div>
                    <div>
                        <Card title="Workflow Progress" status={rfq.status} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                            <WorkflowStepper history={rfq.workflowHistory} currentStatus={rfq.status} />
                        </Card>
                        {currentUser.role === 'Procurement Officer' && canAccess('data', 'audit').others && (
                            <Card title="Recent Audit Log" status={rfq.status} className="card-colored-tint" onClick={() => navigate('AuditLog', rfq.id, 'RFQ')} style={{ marginTop: 'var(--spacing-lg)' }}>
                                {DUMMY_DATA.auditLogs.filter(log => log.entityId === rfq.id).slice(0, 3).map(log => (
                                    <div key={log.id} className="audit-log-entry" style={{ boxShadow: 'none', border: 'none', borderRadius: 0, padding: 0, borderBottom: '1px dotted var(--border-light)' }}>
                                        <p><strong>{log.action}</strong> by {log.by} ({log.role})</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)' }}>{log.details}</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}>{new Date(log.date).toLocaleString()}</p>
                                    </div>
                                ))}
                                <ActionButton label="View Full Audit" onClick={() => navigate('AuditLog', rfq.id, 'RFQ')} className="button-ghost" style={{ marginTop: 'var(--spacing-md)' }} />
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const RFQFormScreen = ({ rfqId, navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const isNew = rfqId === 'new';
    const existingRfq = DUMMY_DATA.rfqs.find(r => r.id === rfqId);
    const [formData, setFormData] = useState(isNew ? {
        id: `RFQ-00${DUMMY_DATA.rfqs.length + 1}`,
        title: '',
        description: '',
        requestedBy: currentUser.id,
        status: 'DRAFT',
        category: '',
        requestedDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        items: [{ name: '', qty: '', unit: '' }],
        quotes: [],
        workflowHistory: [{ status: 'DRAFT', date: new Date().toISOString().split('T')[0], by: currentUser.name }],
        relatedOrderId: null,
        assignedPO: DUMMY_DATA.users.find(u => u.role === 'Procurement Officer')?.id,
    } : { ...existingRfq });

    if (!canAccess('screens', 'RFQForm') || (!isNew && !canAccess('actions', 'edit_rfq_draft') && !canAccess('actions', 'edit_rfq'))) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have permission to create or edit RFQs.</p></div>;
    }

    const handleFieldChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({ ...prev, items: [...prev.items, { name: '', qty: '', unit: '' }] }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const formSchema = {
        sections: [
            {
                title: 'RFQ Details',
                name: 'details',
                fields: [
                    { name: 'id', label: 'RFQ ID', type: 'text', readOnly: true },
                    { name: 'title', label: 'Title', type: 'text', mandatory: true },
                    { name: 'description', label: 'Description', type: 'textarea', mandatory: true },
                    { name: 'category', label: 'Category', type: 'select', mandatory: true, options: [
                        { value: 'Office Supplies', label: 'Office Supplies' },
                        { value: 'IT Equipment', label: 'IT Equipment' },
                        { value: 'Software', label: 'Software' },
                        { value: 'Marketing', label: 'Marketing' },
                        { value: 'Facilities', label: 'Facilities' }
                    ]},
                    { name: 'requestedBy', label: 'Requested By', type: 'text', readOnly: true, autoPopulate: true },
                    { name: 'requestedDate', label: 'Requested Date', type: 'date', readOnly: true, autoPopulate: true },
                    { name: 'dueDate', label: 'Due Date', type: 'date', mandatory: true },
                    { name: 'status', label: 'Current Status', type: 'text', readOnly: true },
                ],
            },
            {
                title: 'Requested Items',
                name: 'items',
                fields: [], // Rendered dynamically below
            },
        ],
    };

    const handleSubmit = () => {
        const finalFormData = { ...formData };
        if (isNew) {
            DUMMY_DATA.rfqs.push(finalFormData);
            DUMMY_DATA.auditLogs.push({
                id: `AL-${DUMMY_DATA.auditLogs.length + 1}`,
                entityType: 'RFQ',
                entityId: finalFormData.id,
                action: 'Created',
                details: `New RFQ ${finalFormData.id} created`,
                by: currentUser.name,
                role: currentUser.role,
                date: new Date().toISOString(),
            });
        } else {
            const index = DUMMY_DATA.rfqs.findIndex(r => r.id === rfqId);
            if (index !== -1) {
                DUMMY_DATA.rfqs[index] = finalFormData;
                DUMMY_DATA.auditLogs.push({
                    id: `AL-${DUMMY_DATA.auditLogs.length + 1}`,
                    entityType: 'RFQ',
                    entityId: finalFormData.id,
                    action: 'Updated',
                    details: `RFQ ${finalFormData.id} details updated`,
                    by: currentUser.name,
                    role: currentUser.role,
                    date: new Date().toISOString(),
                });
            }
        }
        navigate('RFQList');
    };

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>{isNew ? 'Create New RFQ' : `Edit RFQ: ${rfqId}`}</h2>
            </div>
            <div className="page-content">
                <FormRenderer
                    formSchema={formSchema}
                    formData={formData}
                    onChange={handleFieldChange}
                    onSubmit={handleSubmit}
                    onCancel={() => navigate('back')}
                />
                 {/* Dynamic Item fields outside the FormRenderer for simplicity in prototype */}
                 <div className="form-container" style={{ marginTop: 'var(--spacing-lg)' }}>
                    <div className="accordion-section">
                        <div className={`accordion-header expanded`}>
                            <h3>Requested Items</h3>
                            <ActionButton label="Add Item" onClick={addItem} className="button-ghost" icon="➕" />
                        </div>
                        <div className={`accordion-content expanded`}>
                            {formData.items.map((item, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-md)', borderBottom: '1px dotted var(--border-light)' }}>
                                    <div className="form-field" style={{ marginBottom: 0 }}>
                                        <label>Item Name</label>
                                        <input type="text" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} />
                                    </div>
                                    <div className="form-field" style={{ marginBottom: 0 }}>
                                        <label>Quantity</label>
                                        <input type="number" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} />
                                    </div>
                                    <div className="form-field" style={{ marginBottom: 0 }}>
                                        <label>Unit</label>
                                        <input type="text" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} />
                                    </div>
                                    <div style={{ alignSelf: 'flex-end', marginBottom: 'var(--spacing-sm)' }}>
                                        <ActionButton label="Remove" onClick={() => removeItem(index)} className="button-danger" icon="🗑️" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

const OrderListScreen = ({ navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState('orderDate');

    if (!canAccess('screens', 'OrderList')) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to view Orders.</p></div>;
    }

    let filteredOrders = DUMMY_DATA.orders;

    // RBAC: Business User only sees their own orders
    if (currentUser.role === 'Business User') {
        filteredOrders = filteredOrders.filter(order => order.requestedBy === currentUser.id);
    }
    // RBAC: Supplier only sees orders where they are the supplier
    if (currentUser.role === 'Supplier') {
        filteredOrders = filteredOrders.filter(order => order.supplierId === currentUser.id);
    }

    if (filter) {
        filteredOrders = filteredOrders.filter(order =>
            order.title.toLowerCase().includes(filter.toLowerCase()) ||
            order.id.toLowerCase().includes(filter.toLowerCase()) ||
            order.status.toLowerCase().includes(filter.toLowerCase())
        );
    }

    filteredOrders.sort((a, b) => {
        if (sort === 'orderDate') return new Date(b.orderDate) - new Date(a.orderDate);
        if (sort === 'deliveryDate') return new Date(b.deliveryDate) - new Date(a.deliveryDate);
        if (sort === 'status') return a.status.localeCompare(b.status);
        return 0;
    });

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>Order List</h2>
                <div className="global-search-container" style={{ flexGrow: 1, maxWidth: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search Orders..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="global-search-input"
                    />
                </div>
                <div className="section-actions">
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className="global-search-input" style={{ width: 'auto' }}>
                        <option value="orderDate">Sort by Date</option>
                        <option value="deliveryDate">Sort by Delivery Date</option>
                        <option value="status">Sort by Status</option>
                    </select>
                    {canAccess('actions', 'issue_po') && currentUser.role === 'Procurement Officer' && <ActionButton label="Issue New PO" onClick={() => navigate('OrderForm', 'new')} icon="➕" />}
                    <ActionButton label="Export" onClick={() => {}} className="button-secondary" icon="📄" />
                </div>
            </div>
            <div className="page-content">
                {filteredOrders.length === 0 ? (
                    <div className="empty-state">
                        <Icon name="📦" />
                        <p>No orders found. Try adjusting your filters.</p>
                        {canAccess('actions', 'issue_po') && currentUser.role === 'Procurement Officer' && <ActionButton label="Issue New PO" onClick={() => navigate('OrderForm', 'new')} icon="➕" />}
                    </div>
                ) : (
                    <div className="card-grid">
                        {filteredOrders.map(order => {
                            const supplier = DUMMY_DATA.suppliers.find(s => s.id === order.supplierId);
                            return (
                                <Card
                                    key={order.id}
                                    title={`${order.id}: ${order.title}`}
                                    status={order.status}
                                    onClick={() => navigate('OrderDetail', order.id, 'Order')}
                                    footerContent={
                                        <>
                                            <span>Supplier: {supplier?.name || 'N/A'}</span>
                                            <span>Ordered: {order.orderDate}</span>
                                        </>
                                    }
                                >
                                    <p style={{ color: 'var(--text-color-dark)', margin: '0 0 var(--spacing-sm) 0' }}>PO: {order.poNumber || 'Pending'}</p>
                                    <p style={{ margin: 0 }}><StatusBadge status={order.status} /></p>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const OrderDetailScreen = ({ orderId, navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const { addToast } = useToast();
    const order = DUMMY_DATA.orders.find(o => o.id === orderId);

    if (!order || (currentUser.role === 'Business User' && order.requestedBy !== currentUser.id) || (currentUser.role === 'Supplier' && order.supplierId !== currentUser.id)) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Order Not Found or Access Denied</h2></div>;
    }
    if (!canAccess('screens', 'OrderDetail')) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to view Order details.</p></div>;
    }

    const supplier = DUMMY_DATA.suppliers.find(s => s.id === order.supplierId);

    const handleAction = (action, orderToUpdate) => {
        addToast(`Action "${action}" on Order ${orderToUpdate.id} mocked`, 'info');
        const updatedOrder = { ...orderToUpdate };
        let newStatus = orderToUpdate.status;

        if (action === 'issue_po' && orderToUpdate.status === 'PENDING_APPROVAL' && currentUser.role === 'Procurement Officer') {
            newStatus = 'PO_ISSUED';
            updatedOrder.poNumber = `PO-${new Date().getFullYear()}-${String(DUMMY_DATA.orders.length + 1).padStart(3, '0')}`;
        } else if (action === 'accept_order' && orderToUpdate.status === 'PO_ISSUED' && currentUser.role === 'Supplier') {
            newStatus = 'ACCEPTED';
        } else if (action === 'mark_ready' && orderToUpdate.status === 'ACCEPTED' && currentUser.role === 'Supplier') {
            newStatus = 'READY';
        } else if (action === 'mark_delivered_picked' && orderToUpdate.status === 'READY' && (currentUser.role === 'Supplier' || currentUser.role === 'Procurement Officer')) {
            newStatus = orderToUpdate.deliveryOption === 'Customer Picked' ? 'CUSTOMER_PICKED' : 'DELIVERED';
        } else if (action === 'edit_order' && currentUser.role === 'Procurement Officer') {
            navigate('OrderForm', orderToUpdate.id, 'Order');
            return;
        }

        if (newStatus !== orderToUpdate.status) {
            updatedOrder.status = newStatus;
            updatedOrder.workflowHistory.push({ status: newStatus, date: new Date().toISOString().split('T')[0], by: currentUser.name });
            updatedOrder.auditLogs.push({
                action: 'Order Status Changes',
                details: `Status changed from ${orderToUpdate.status} to ${newStatus}`,
                by: currentUser.name,
                role: currentUser.role,
                date: new Date().toISOString()
            });

            const orderIndex = DUMMY_DATA.orders.findIndex(o => o.id === orderToUpdate.id);
            if (orderIndex !== -1) {
                DUMMY_DATA.orders[orderIndex] = updatedOrder;
            }
            navigate('OrderList'); // Refresh list or stay on detail
        } else {
            addToast('No status change occurred.', 'info');
        }
    };

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>Order Details: {order.id}</h2>
                <div className="section-actions">
                    {order.status === 'PENDING_APPROVAL' && currentUser.role === 'Procurement Officer' && canAccess('actions', 'issue_po') && (
                        <ActionButton label="Issue PO" onClick={() => handleAction('issue_po', order)} className="button-primary" icon="✍️" />
                    )}
                    {order.status === 'PO_ISSUED' && currentUser.role === 'Supplier' && canAccess('actions', 'accept_order') && (
                        <ActionButton label="Accept Order" onClick={() => handleAction('accept_order', order)} className="button-primary" icon="🤝" />
                    )}
                    {order.status === 'ACCEPTED' && currentUser.role === 'Supplier' && canAccess('actions', 'mark_order_ready') && (
                        <ActionButton label="Mark Ready" onClick={() => handleAction('mark_ready', order)} className="button-primary" icon="📦" />
                    )}
                    {order.status === 'READY' && (currentUser.role === 'Supplier' || (currentUser.role === 'Procurement Officer' && order.deliveryOption === 'Customer Picked')) && canAccess('actions', 'mark_order_delivered') && (
                        <ActionButton label={order.deliveryOption === 'Customer Picked' ? 'Mark Picked Up' : 'Mark Delivered'} onClick={() => handleAction('mark_delivered_picked', order)} className="button-primary" icon="🚚" />
                    )}
                    {canAccess('actions', 'edit_order') && currentUser.role === 'Procurement Officer' && !['DELIVERED', 'CUSTOMER_PICKED', 'COMPLETED', 'CANCELLED'].includes(order.status) && (
                        <ActionButton label="Edit Order" onClick={() => handleAction('edit_order', order)} className="button-secondary" icon="✏️" />
                    )}
                    {order.rfqId && canAccess('screens', 'RFQDetail') && (
                        <ActionButton label="View Related RFQ" onClick={() => navigate('RFQDetail', order.rfqId, 'RFQ')} className="button-secondary" icon="🔗" />
                    )}
                </div>
            </div>
            <div className="page-content">
                <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        <Card title="Order Info" status={order.status} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                            <p><strong>Title:</strong> {order.title}</p>
                            <p><strong>PO Number:</strong> {order.poNumber || 'N/A'}</p>
                            <p><strong>Supplier:</strong> {supplier?.name || 'N/A'}</p>
                            <p><strong>Requested By:</strong> {DUMMY_DATA.users.find(u => u.id === order.requestedBy)?.name}</p>
                            <p><strong>Order Date:</strong> {order.orderDate}</p>
                            <p><strong>Delivery Date:</strong> {order.deliveryDate || 'Pending'}</p>
                            <p><strong>Delivery Option:</strong> {order.deliveryOption || 'N/A'}</p>
                            <p><strong>Price:</strong> ${order.price} {order.currency}</p>
                            <p><strong>Status:</strong> <StatusBadge status={order.status} /></p>
                        </Card>
                        <Card title="Order Items" status={order.status} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {order.items.map((item, index) => (
                                    <li key={index} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0', borderBottom: '1px dotted var(--border-light)' }}>
                                        {item.qty} {item.unit} of {item.name}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                        {order.auditLogs && order.auditLogs.length > 0 && (
                            <Card title="Recent Order Audit" status={order.status} className="card-colored-tint" onClick={() => navigate('AuditLog', order.id, 'Order')} style={{ cursor: 'default' }}>
                                {order.auditLogs.slice(0, 3).map((log, index) => (
                                    <div key={index} className="audit-log-entry" style={{ boxShadow: 'none', border: 'none', borderRadius: 0, padding: 0, borderBottom: '1px dotted var(--border-light)' }}>
                                        <p><strong>{log.action}</strong> by {log.by}</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)' }}>{log.details}</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}>{new Date(log.date).toLocaleString()}</p>
                                    </div>
                                ))}
                                <ActionButton label="View Full Audit" onClick={() => navigate('AuditLog', order.id, 'Order')} className="button-ghost" style={{ marginTop: 'var(--spacing-md)' }} />
                            </Card>
                        )}
                    </div>
                    <div>
                        <Card title="Workflow Timeline" status={order.status} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                            <WorkflowStepper history={order.workflowHistory} currentStatus={order.status} />
                        </Card>
                         {supplier?.documents && supplier.documents.length > 0 && (
                             <Card title="Related Documents" status={'ACTIVE'} className="card-colored-tint" onClick={() => {}} style={{ marginTop: 'var(--spacing-lg)', cursor: 'default' }}>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {supplier.documents.map((doc, index) => (
                                        <li key={index} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0', borderBottom: '1px dotted var(--border-light)' }}>
                                            <a href="#" onClick={(e) => { e.preventDefault(); addToast(`Previewing ${doc} (mocked)`, 'info'); }}>
                                                <Icon name="📄" /> {doc}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const OrderFormScreen = ({ orderId, navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const isNew = orderId === 'new';
    const existingOrder = DUMMY_DATA.orders.find(o => o.id === orderId);

    const [formData, setFormData] = useState(isNew ? {
        id: `ORD-00${DUMMY_DATA.orders.length + 1}`,
        rfqId: '',
        title: '',
        requestedBy: currentUser.id,
        supplierId: '',
        status: 'DRAFT', // PO starts as draft
        poNumber: '',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        price: 0,
        currency: 'USD',
        deliveryOption: 'Supplier Delivery',
        items: [{ name: '', qty: '', unit: '' }],
        workflowHistory: [{ status: 'DRAFT', date: new Date().toISOString().split('T')[0], by: currentUser.name }],
        auditLogs: [],
    } : { ...existingOrder });

    if (!canAccess('screens', 'OrderForm') || (!isNew && !canAccess('actions', 'edit_order'))) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have permission to create or edit Orders.</p></div>;
    }

    const handleFieldChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const formSchema = {
        sections: [
            {
                title: 'Order Details',
                name: 'details',
                fields: [
                    { name: 'id', label: 'Order ID', type: 'text', readOnly: true },
                    { name: 'title', label: 'Order Title', type: 'text', mandatory: true },
                    { name: 'rfqId', label: 'Related RFQ ID', type: 'text', readOnly: !isNew && !canAccess('actions', 'edit_order') },
                    { name: 'supplierId', label: 'Supplier', type: 'select', mandatory: true,
                      options: DUMMY_DATA.suppliers.map(s => ({ value: s.id, label: s.name })),
                      readOnly: !isNew && !canAccess('actions', 'edit_order')
                    },
                    { name: 'poNumber', label: 'PO Number', type: 'text', readOnly: isNew || !canAccess('actions', 'issue_po'), roles: ['Procurement Officer'] },
                    { name: 'orderDate', label: 'Order Date', type: 'date', readOnly: true },
                    { name: 'deliveryDate', label: 'Delivery Date', type: 'date', mandatory: true },
                    { name: 'price', label: 'Price', type: 'number', mandatory: true, readOnlyRoles: ['Business User'] },
                    { name: 'currency', label: 'Currency', type: 'text', readOnly: true },
                    { name: 'deliveryOption', label: 'Delivery Option', type: 'select', mandatory: true, options: [
                        { value: 'Supplier Delivery', label: 'Supplier Delivery' },
                        { value: 'Customer Picked', label: 'Customer Picked' },
                        { value: 'Service Contract', label: 'Service Contract' }
                    ]},
                    { name: 'status', label: 'Current Status', type: 'text', readOnly: true },
                ],
            },
            {
                title: 'Order Items',
                name: 'items',
                fields: [], // Rendered dynamically
            },
        ],
    };

    const handleSubmit = () => {
        const finalFormData = { ...formData };
        if (isNew) {
            finalFormData.poNumber = `PO-${new Date().getFullYear()}-${String(DUMMY_DATA.orders.length + 1).padStart(3, '0')}`; // Auto-generate PO
            finalFormData.status = 'PO_ISSUED'; // Auto-transition to PO_ISSUED on creation
            finalFormData.workflowHistory.push({ status: 'PO_ISSUED', date: new Date().toISOString().split('T')[0], by: currentUser.name });
            DUMMY_DATA.orders.push(finalFormData);
            DUMMY_DATA.auditLogs.push({
                id: `AL-${DUMMY_DATA.auditLogs.length + 1}`,
                entityType: 'Order',
                entityId: finalFormData.id,
                action: 'PO Issued',
                details: `New PO ${finalFormData.poNumber} issued`,
                by: currentUser.name,
                role: currentUser.role,
                date: new Date().toISOString(),
            });
        } else {
            const index = DUMMY_DATA.orders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                DUMMY_DATA.orders[index] = finalFormData;
                DUMMY_DATA.auditLogs.push({
                    id: `AL-${DUMMY_DATA.auditLogs.length + 1}`,
                    entityType: 'Order',
                    entityId: finalFormData.id,
                    action: 'Updated',
                    details: `Order ${finalFormData.id} details updated`,
                    by: currentUser.name,
                    role: currentUser.role,
                    date: new Date().toISOString(),
                });
            }
        }
        navigate('OrderList');
    };

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>{isNew ? 'Issue New Purchase Order' : `Edit Order: ${orderId}`}</h2>
            </div>
            <div className="page-content">
                <FormRenderer
                    formSchema={formSchema}
                    formData={formData}
                    onChange={handleFieldChange}
                    onSubmit={handleSubmit}
                    onCancel={() => navigate('back')}
                    readOnly={!isNew && !canAccess('actions', 'edit_order')}
                />
                {/* Dynamic Item fields outside the FormRenderer for simplicity in prototype */}
                <div className="form-container" style={{ marginTop: 'var(--spacing-lg)' }}>
                    <div className="accordion-section">
                        <div className={`accordion-header expanded`}>
                            <h3>Order Items</h3>
                            {(!existingOrder || (existingOrder && canAccess('actions', 'edit_order'))) && (
                                <ActionButton label="Add Item" onClick={() => setFormData(prev => ({ ...prev, items: [...prev.items, { name: '', qty: '', unit: '' }] }))} className="button-ghost" icon="➕" />
                            )}
                        </div>
                        <div className={`accordion-content expanded`}>
                            {formData.items.map((item, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-md)', borderBottom: '1px dotted var(--border-light)' }}>
                                    <div className="form-field" style={{ marginBottom: 0 }}>
                                        <label>Item Name</label>
                                        <input type="text" value={item.name} onChange={(e) => handleFieldChange(`items[${index}].name`, e.target.value)} disabled={!isNew && !canAccess('actions', 'edit_order')}/>
                                    </div>
                                    <div className="form-field" style={{ marginBottom: 0 }}>
                                        <label>Quantity</label>
                                        <input type="number" value={item.qty} onChange={(e) => handleFieldChange(`items[${index}].qty`, e.target.value)} disabled={!isNew && !canAccess('actions', 'edit_order')}/>
                                    </div>
                                    <div className="form-field" style={{ marginBottom: 0 }}>
                                        <label>Unit</label>
                                        <input type="text" value={item.unit} onChange={(e) => handleFieldChange(`items[${index}].unit`, e.target.value)} disabled={!isNew && !canAccess('actions', 'edit_order')}/>
                                    </div>
                                    {(!existingOrder || (existingOrder && canAccess('actions', 'edit_order'))) && (
                                        <div style={{ alignSelf: 'flex-end', marginBottom: 'var(--spacing-sm)' }}>
                                            <ActionButton label="Remove" onClick={() => setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))} className="button-danger" icon="🗑️" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SupplierListScreen = ({ navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState('name');

    if (!canAccess('screens', 'SupplierList')) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to view Suppliers.</p></div>;
    }

    let filteredSuppliers = DUMMY_DATA.suppliers;

    if (filter) {
        filteredSuppliers = filteredSuppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(filter.toLowerCase()) ||
            supplier.id.toLowerCase().includes(filter.toLowerCase()) ||
            supplier.status.toLowerCase().includes(filter.toLowerCase()) ||
            supplier.contactPerson.toLowerCase().includes(filter.toLowerCase())
        );
    }

    filteredSuppliers.sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'status') return a.status.localeCompare(b.status);
        if (sort === 'registrationDate') return new Date(b.registrationDate) - new Date(a.registrationDate);
        return 0;
    });

    const createSupplier = () => navigate('SupplierForm', 'new');

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>Supplier List</h2>
                <div className="global-search-container" style={{ flexGrow: 1, maxWidth: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search Suppliers..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="global-search-input"
                    />
                </div>
                <div className="section-actions">
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className="global-search-input" style={{ width: 'auto' }}>
                        <option value="name">Sort by Name</option>
                        <option value="status">Sort by Status</option>
                        <option value="registrationDate">Sort by Registration Date</option>
                    </select>
                    {canAccess('actions', 'onboard_supplier') && <ActionButton label="Onboard New Supplier" onClick={createSupplier} icon="➕" />}
                    <ActionButton label="Export" onClick={() => {}} className="button-secondary" icon="📄" />
                </div>
            </div>
            <div className="page-content">
                {filteredSuppliers.length === 0 ? (
                    <div className="empty-state">
                        <Icon name="👥" />
                        <p>No suppliers found. Try adjusting your filters or onboard a new one!</p>
                        {canAccess('actions', 'onboard_supplier') && <ActionButton label="Onboard New Supplier" onClick={createSupplier} icon="➕" />}
                    </div>
                ) : (
                    <div className="card-grid">
                        {filteredSuppliers.map(supplier => (
                            <Card
                                key={supplier.id}
                                title={`${supplier.id}: ${supplier.name}`}
                                status={supplier.status}
                                onClick={() => navigate('SupplierDetail', supplier.id, 'Supplier')}
                                footerContent={
                                    <>
                                        <span>Contact: {supplier.contactPerson}</span>
                                        <span>Last Activity: {supplier.lastActivity}</span>
                                    </>
                                }
                            >
                                <p style={{ color: 'var(--text-color-dark)', margin: '0 0 var(--spacing-sm) 0' }}>{supplier.email}</p>
                                <p style={{ margin: 0 }}><StatusBadge status={supplier.status} /></p>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const SupplierDetailScreen = ({ supplierId, navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const { addToast } = useToast();
    const supplier = DUMMY_DATA.suppliers.find(s => s.id === supplierId);

    if (!supplier || (currentUser.role === 'Supplier' && supplier.id !== currentUser.id)) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Supplier Not Found or Access Denied</h2></div>;
    }
    if (!canAccess('screens', 'SupplierDetail') && !canAccess('screens', 'SupplierPortal')) { // SupplierPortal allows viewing their own detail
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to view Supplier details.</p></div>;
    }

    const relatedRFQs = DUMMY_DATA.rfqs.filter(rfq => rfq.quotes.some(q => q.supplierId === supplierId));
    const relatedOrders = DUMMY_DATA.orders.filter(order => order.supplierId === supplierId);

    const handleAction = (action) => {
        addToast(`Action "${action}" on Supplier ${supplier.id} mocked`, 'info');
        if (action === 'edit_supplier') {
            navigate('SupplierForm', supplier.id, 'Supplier');
        }
    };

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>Supplier Details: {supplier.name}</h2>
                <div className="section-actions">
                    {(canAccess('actions', 'edit_supplier') || (currentUser.role === 'Supplier' && canAccess('actions', 'edit_supplier_profile'))) && (
                        <ActionButton label="Edit Profile" onClick={() => handleAction('edit_supplier')} icon="✏️" />
                    )}
                    {canAccess('actions', 'manage_catalog_items') && currentUser.role === 'Supplier' && (
                        <ActionButton label="Manage Catalog" onClick={() => addToast('Manage Catalog functionality mocked', 'info')} icon="🛒" />
                    )}
                </div>
            </div>
            <div className="page-content">
                <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        <Card title="Supplier Overview" status={supplier.status} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                            <p><strong>Contact Person:</strong> {supplier.contactPerson}</p>
                            <p><strong>Email:</strong> {supplier.email}</p>
                            <p><strong>Phone:</strong> {supplier.phone}</p>
                            <p><strong>Address:</strong> {supplier.address}</p>
                            <p><strong>Registration Date:</strong> {supplier.registrationDate}</p>
                            <p><strong>Last Activity:</strong> {supplier.lastActivity}</p>
                            <p><strong>Compliance:</strong> {supplier.compliance}</p>
                            <p><strong>Status:</strong> <StatusBadge status={supplier.status} /></p>
                        </Card>
                        {relatedRFQs.length > 0 && canAccess('data', 'rfq').others && (
                            <Card title="Related RFQs" status={relatedRFQs[0]?.status || 'CREATED'} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {relatedRFQs.slice(0, 3).map(rfq => (
                                        <li key={rfq.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0', borderBottom: '1px dotted var(--border-light)' }} onClick={() => navigate('RFQDetail', rfq.id, 'RFQ')}>
                                            <p><strong>{rfq.id}:</strong> {rfq.title}</p>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}><StatusBadge status={rfq.status} /> - Due: {rfq.dueDate}</p>
                                        </li>
                                    ))}
                                </ul>
                                {relatedRFQs.length > 3 && <ActionButton label="View All Related RFQs" onClick={() => navigate('RFQList', null, 'RFQ')} className="button-ghost" style={{ marginTop: 'var(--spacing-md)' }} />}
                            </Card>
                        )}
                        {relatedOrders.length > 0 && canAccess('data', 'order').others && (
                            <Card title="Related Orders" status={relatedOrders[0]?.status || 'PO_ISSUED'} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {relatedOrders.slice(0, 3).map(order => (
                                        <li key={order.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0', borderBottom: '1px dotted var(--border-light)' }} onClick={() => navigate('OrderDetail', order.id, 'Order')}>
                                            <p><strong>{order.id}:</strong> {order.title}</p>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}><StatusBadge status={order.status} /> - Total: ${order.price}</p>
                                        </li>
                                    ))}
                                </ul>
                                {relatedOrders.length > 3 && <ActionButton label="View All Related Orders" onClick={() => navigate('OrderList', null, 'Order')} className="button-ghost" style={{ marginTop: 'var(--spacing-md)' }} />}
                            </Card>
                        )}
                    </div>
                    <div>
                        <Card title="Documents" status={'ACTIVE'} className="card-colored-tint" onClick={() => {}} style={{ cursor: 'default' }}>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {supplier.documents.map((doc, index) => (
                                    <li key={index} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0', borderBottom: '1px dotted var(--border-light)' }}>
                                        <a href="#" onClick={(e) => { e.preventDefault(); addToast(`Previewing ${doc} (mocked)`, 'info'); }}>
                                            <Icon name="📄" /> {doc}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                        {currentUser.role === 'Procurement Officer' && canAccess('data', 'audit').others && (
                             <Card title="Recent Audit Log" status={supplier.status} className="card-colored-tint" onClick={() => navigate('AuditLog', supplier.id, 'Supplier')} style={{ marginTop: 'var(--spacing-lg)', cursor: 'default' }}>
                                {DUMMY_DATA.auditLogs.filter(log => log.entityId === supplier.id).slice(0, 3).map(log => (
                                    <div key={log.id} className="audit-log-entry" style={{ boxShadow: 'none', border: 'none', borderRadius: 0, padding: 0, borderBottom: '1px dotted var(--border-light)' }}>
                                        <p><strong>{log.action}</strong> by {log.by} ({log.role})</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)' }}>{log.details}</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}>{new Date(log.date).toLocaleString()}</p>
                                    </div>
                                ))}
                                <ActionButton label="View Full Audit" onClick={() => navigate('AuditLog', supplier.id, 'Supplier')} className="button-ghost" style={{ marginTop: 'var(--spacing-md)' }} />
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SupplierFormScreen = ({ supplierId, navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const isNew = supplierId === 'new';
    const existingSupplier = DUMMY_DATA.suppliers.find(s => s.id === supplierId);

    const [formData, setFormData] = useState(isNew ? {
        id: `s${DUMMY_DATA.suppliers.length + 1}`,
        name: '',
        status: 'ONBOARDING',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        registrationDate: new Date().toISOString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0],
        compliance: 'Pending Documents',
        documents: [],
    } : { ...existingSupplier });

    if (!canAccess('screens', 'SupplierForm') || (!isNew && !canAccess('actions', 'edit_supplier') && !(currentUser.role === 'Supplier' && canAccess('actions', 'edit_supplier_profile')))) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have permission to onboard or edit suppliers.</p></div>;
    }

    const handleFieldChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = (name, file) => {
        if (file) {
            setFormData(prev => ({ ...prev, documents: [...prev.documents, file.name] }));
        }
    };

    const formSchema = {
        sections: [
            {
                title: 'Supplier Details',
                name: 'details',
                fields: [
                    { name: 'id', label: 'Supplier ID', type: 'text', readOnly: true },
                    { name: 'name', label: 'Supplier Name', type: 'text', mandatory: true, readOnlyRoles: ['Supplier'] },
                    { name: 'contactPerson', label: 'Contact Person', type: 'text', mandatory: true },
                    { name: 'email', label: 'Email', type: 'text', mandatory: true },
                    { name: 'phone', label: 'Phone', type: 'text' },
                    { name: 'address', label: 'Address', type: 'textarea', mandatory: true },
                    { name: 'registrationDate', label: 'Registration Date', type: 'date', readOnly: true },
                    { name: 'status', label: 'Status', type: select, mandatory: true, roles: ['Procurement Officer'],
                      options: [
                        { value: 'ONBOARDING', label: 'Onboarding' },
                        { value: 'ACTIVE', label: 'Active' },
                        { value: 'INACTIVE', label: 'Inactive' },
                        { value: 'COMPLIANCE_ISSUE', label: 'Compliance Issue' }
                      ]
                    },
                    { name: 'compliance', label: 'Compliance Status', type: 'text', readOnlyRoles: ['Supplier'], roles: ['Procurement Officer']},
                ],
            },
            {
                title: 'Documents',
                name: 'documents',
                fields: [
                    { name: 'fileUpload', label: 'Upload Document', type: 'file', onChange: handleFileUpload }
                ],
            }
        ],
    };

    const handleSubmit = () => {
        const finalFormData = { ...formData };
        if (isNew) {
            DUMMY_DATA.suppliers.push(finalFormData);
            DUMMY_DATA.auditLogs.push({
                id: `AL-${DUMMY_DATA.auditLogs.length + 1}`,
                entityType: 'Supplier',
                entityId: finalFormData.id,
                action: 'Onboarded',
                details: `New supplier ${finalFormData.name} onboarded`,
                by: currentUser.name,
                role: currentUser.role,
                date: new Date().toISOString(),
            });
        } else {
            const index = DUMMY_DATA.suppliers.findIndex(s => s.id === supplierId);
            if (index !== -1) {
                DUMMY_DATA.suppliers[index] = finalFormData;
                DUMMY_DATA.auditLogs.push({
                    id: `AL-${DUMMY_DATA.auditLogs.length + 1}`,
                    entityType: 'Supplier',
                    entityId: finalFormData.id,
                    action: 'Updated',
                    details: `Supplier ${finalFormData.name} details updated`,
                    by: currentUser.name,
                    role: currentUser.role,
                    date: new Date().toISOString(),
                });
            }
        }
        navigate('SupplierList');
    };

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>{isNew ? 'Onboard New Supplier' : `Edit Supplier: ${supplierId}`}</h2>
            </div>
            <div className="page-content">
                <FormRenderer
                    formSchema={formSchema}
                    formData={formData}
                    onChange={handleFieldChange}
                    onSubmit={handleSubmit}
                    onCancel={() => navigate('back')}
                    readOnly={false} // Read-only logic is in the field definitions
                />
                 {/* Display current documents */}
                 {formData.documents && formData.documents.length > 0 && (
                     <div className="form-container" style={{ marginTop: 'var(--spacing-lg)' }}>
                         <div className="accordion-section">
                             <div className={`accordion-header expanded`}>
                                 <h3>Current Documents</h3>
                             </div>
                             <div className={`accordion-content expanded`}>
                                 <ul style={{ listStyle: 'none', padding: 0 }}>
                                     {formData.documents.map((doc, index) => (
                                         <li key={index} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0', borderBottom: '1px dotted var(--border-light)' }}>
                                             <Icon name="📄" /> {doc}
                                         </li>
                                     ))}
                                 </ul>
                             </div>
                         </div>
                     </div>
                 )}
            </div>
        </div>
    );
};

const TaskListScreen = ({ navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState('dueDate');

    if (!canAccess('screens', 'TaskList')) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to view tasks.</p></div>;
    }

    let filteredTasks = DUMMY_DATA.tasks;

    // RBAC: Only show tasks assigned to the current user
    filteredTasks = filteredTasks.filter(task => task.assignedTo === currentUser.id);

    if (filter) {
        filteredTasks = filteredTasks.filter(task =>
            task.title.toLowerCase().includes(filter.toLowerCase()) ||
            task.status.toLowerCase().includes(filter.toLowerCase()) ||
            task.type.toLowerCase().includes(filter.toLowerCase())
        );
    }

    filteredTasks.sort((a, b) => {
        if (sort === 'dueDate') return new Date(a.dueDate) - new Date(b.dueDate);
        if (sort === 'status') return a.status.localeCompare(b.status);
        if (sort === 'type') return a.type.localeCompare(b.type);
        return 0;
    });

    const handleTaskClick = (task) => {
        navigate(`${task.entityType}Detail`, task.entityId, task.entityType);
    };

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>My Tasks</h2>
                <div className="global-search-container" style={{ flexGrow: 1, maxWidth: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="global-search-input"
                    />
                </div>
                <div className="section-actions">
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className="global-search-input" style={{ width: 'auto' }}>
                        <option value="dueDate">Sort by Due Date</option>
                        <option value="status">Sort by Status</option>
                        <option value="type">Sort by Type</option>
                    </select>
                    <ActionButton label="Bulk Complete" onClick={() => addToast('Bulk complete tasks mocked', 'info')} className="button-secondary" icon="✅" />
                </div>
            </div>
            <div className="page-content">
                {filteredTasks.length === 0 ? (
                    <div className="empty-state">
                        <Icon name="🎉" />
                        <p>No tasks found. You're all caught up!</p>
                    </div>
                ) : (
                    <div className="card-grid">
                        {filteredTasks.map(task => (
                            <Card
                                key={task.id}
                                title={`${task.type}: ${task.title}`}
                                status={task.status === 'PENDING' ? 'ORANGE' : 'GREEN'} // Simplified status for task cards
                                onClick={() => handleTaskClick(task)}
                                footerContent={
                                    <>
                                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                        <StatusBadge status={task.status} />
                                    </>
                                }
                            >
                                <p style={{ color: 'var(--text-color-dark)', margin: '0 0 var(--spacing-sm) 0' }}>Related to {task.entityType}: {task.entityId}</p>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const AuditLogScreen = ({ entityId, entityType, navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const [filter, setFilter] = useState('');

    if (!canAccess('screens', 'AuditLog')) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to view audit logs.</p></div>;
    }

    let logs = DUMMY_DATA.auditLogs;

    // RBAC: Data visibility for audit logs
    if (currentUser.role === 'Business User' && !canAccess('data', 'audit').others) {
        logs = logs.filter(log => log.by === currentUser.name);
    }
    // If specific entity context, filter further
    if (entityId) {
        logs = logs.filter(log => log.entityId === entityId && log.entityType === entityType);
    }

    if (filter) {
        logs = logs.filter(log =>
            log.action.toLowerCase().includes(filter.toLowerCase()) ||
            log.details.toLowerCase().includes(filter.toLowerCase()) ||
            log.by.toLowerCase().includes(filter.toLowerCase()) ||
            log.entityId.toLowerCase().includes(filter.toLowerCase())
        );
    }

    logs.sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>Audit Log {entityId ? `for ${entityType} ${entityId}` : 'System-Wide'}</h2>
                <div className="global-search-container" style={{ flexGrow: 1, maxWidth: '300px' }}>
                    <input
                        type="text"
                        placeholder="Search audit entries..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="global-search-input"
                    />
                </div>
            </div>
            <div className="page-content">
                {logs.length === 0 ? (
                    <div className="empty-state">
                        <Icon name="📜" />
                        <p>No audit log entries found.</p>
                    </div>
                ) : (
                    <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                        {logs.map(log => (
                            <Card
                                key={log.id}
                                title={`${log.action} (${log.entityType}: ${log.entityId})`}
                                status={log.action === 'Approved' || log.action === 'PO Issued' ? 'GREEN' : (log.action === 'Rejected' ? 'RED' : 'BLUE')} // Simplified status
                                onClick={() => {}} // Audit logs are usually read-only
                                style={{ cursor: 'default' }}
                                footerContent={
                                    <>
                                        <span>By: {log.by} ({log.role})</span>
                                        <span>{new Date(log.date).toLocaleString()}</span>
                                    </>
                                }
                            >
                                <p style={{ color: 'var(--text-color-dark)', margin: '0 0 var(--spacing-sm) 0' }}>{log.details}</p>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const NotificationCenterScreen = ({ navigate }) => {
    const { currentUser, canAccess } = useAuth();
    const { addToast } = useToast();
    const [notifications, setNotifications] = useState(DUMMY_DATA.notifications.filter(n => n.userId === currentUser.id));

    if (!canAccess('screens', 'NotificationCenter')) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to notifications.</p></div>;
    }

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        const globalIndex = DUMMY_DATA.notifications.findIndex(n => n.id === id);
        if(globalIndex !== -1) DUMMY_DATA.notifications[globalIndex].read = true; // Update dummy data
        addToast('Notification marked as read.', 'info');
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        DUMMY_DATA.notifications.forEach(n => { if (n.userId === currentUser.id) n.read = true; }); // Update dummy data
        addToast('All notifications marked as read.', 'info');
    };

    const sortedNotifications = [...notifications].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>Notification Center</h2>
                <div className="section-actions">
                    <ActionButton label="Mark All as Read" onClick={markAllAsRead} className="button-secondary" icon="✔️" disabled={sortedNotifications.every(n => n.read)} />
                </div>
            </div>
            <div className="page-content">
                {sortedNotifications.length === 0 ? (
                    <div className="empty-state">
                        <Icon name="🎉" />
                        <p>No notifications. You're up to date!</p>
                    </div>
                ) : (
                    <div className="card-grid" style={{ gridTemplateColumns: '1fr' }}>
                        {sortedNotifications.map(notif => (
                            <Card
                                key={notif.id}
                                title={notif.message}
                                status={notif.read ? 'GREY' : (notif.type === 'error' ? 'RED' : (notif.type === 'warning' ? 'ORANGE' : 'BLUE'))}
                                onClick={() => !notif.read && markAsRead(notif.id)}
                                style={{ opacity: notif.read ? 0.7 : 1 }}
                                footerContent={
                                    <>
                                        <span>{new Date(notif.date).toLocaleString()}</span>
                                        {!notif.read && <ActionButton label="Mark Read" onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }} className="button-ghost" icon="✔️" />}
                                    </>
                                }
                            >
                                <p style={{ color: 'var(--text-color-dark)' }}>Type: {notif.type}</p>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Supplier Specific Portal View (No full dashboard needed based on prompt) ---
const SupplierPortal = ({ currentUser, navigate }) => {
    const { canAccess } = useAuth();
    const { addToast } = useToast();

    if (!canAccess('screens', 'SupplierPortal')) {
        return <div className="full-screen-page page-content"><h2 style={{ color: 'var(--status-red)' }}>Access Denied</h2><p>You do not have access to the Supplier Portal.</p></div>;
    }

    const supplierOrders = DUMMY_DATA.orders.filter(order => order.supplierId === currentUser.id);
    const pendingQuotes = DUMMY_DATA.rfqs.filter(rfq => rfq.status === 'APPROVED' && !rfq.quotes.some(q => q.supplierId === currentUser.id)); // RFQs approved but no quote from this supplier yet
    const mySubmittedQuotes = DUMMY_DATA.rfqs.filter(rfq => rfq.quotes.some(q => q.supplierId === currentUser.id && q.status === 'SUBMITTED'));

    return (
        <div className="full-screen-page">
            <div className="page-header">
                <ActionButton label="Back" onClick={() => navigate('back')} className="button-ghost" icon="⬅️" />
                <h2>Supplier Portal: {currentUser.name}</h2>
                <div className="section-actions">
                    {canAccess('actions', 'edit_supplier_profile') && <ActionButton label="Edit Profile" onClick={() => navigate('SupplierDetail', currentUser.id, 'Supplier')} icon="✏️" />}
                    {canAccess('actions', 'manage_catalog_items') && <ActionButton label="Manage Catalog" onClick={() => addToast('Manage Catalog functionality mocked', 'info')} icon="🛒" />}
                </div>
            </div>
            <div className="page-content">
                <section>
                    <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>My Quotes & Orders</h2>
                    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="card" style={{ cursor: 'default' }}>
                            <div className="card-header" style={{ backgroundColor: 'var(--status-orange)' }}>RFQs Requiring My Quote</div>
                            <div className="card-body">
                                {pendingQuotes.length > 0 ? (
                                    pendingQuotes.map(rfq => (
                                        <div key={rfq.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate('RFQDetail', rfq.id, 'RFQ')}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color-dark)' }}>{rfq.id}: {rfq.title}</p>
                                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}>Due: {new Date(rfq.dueDate).toLocaleDateString()}</p>
                                            </div>
                                            <ActionButton label="Submit Quote" onClick={(e) => { e.stopPropagation(); addToast(`Submit quote for ${rfq.id} mocked`, 'info'); }} className="button-primary" />
                                        </div>
                                    ))
                                ) : (
                                    <p>No RFQs currently require your quote.</p>
                                )}
                            </div>
                        </div>

                        <div className="card" style={{ cursor: 'default' }}>
                            <div className="card-header" style={{ backgroundColor: 'var(--status-blue)' }}>My Submitted Quotes</div>
                            <div className="card-body">
                                {mySubmittedQuotes.length > 0 ? (
                                    mySubmittedQuotes.map(rfq => (
                                        <div key={rfq.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate('RFQDetail', rfq.id, 'RFQ')}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color-dark)' }}>{rfq.id}: {rfq.title}</p>
                                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}>Status: {rfq.status}</p>
                                            </div>
                                            <StatusBadge status={rfq.status} />
                                        </div>
                                    ))
                                ) : (
                                    <p>No submitted quotes.</p>
                                )}
                            </div>
                        </div>

                        <div className="card" style={{ cursor: 'default' }}>
                            <div className="card-header" style={{ backgroundColor: 'var(--status-green)' }}>My Approved POs</div>
                            <div className="card-body">
                                {supplierOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CUSTOMER_PICKED' && o.status !== 'COMPLETED').length > 0 ? (
                                    supplierOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CUSTOMER_PICKED' && o.status !== 'COMPLETED').map(order => (
                                        <div key={order.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate('OrderDetail', order.id, 'Order')}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color-dark)' }}>{order.poNumber || order.id}: {order.title}</p>
                                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}>Due: {new Date(order.deliveryDate).toLocaleDateString()}</p>
                                            </div>
                                            <StatusBadge status={order.status} />
                                        </div>
                                    ))
                                ) : (
                                    <p>No active purchase orders.</p>
                                )}
                            </div>
                            <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
                                <ActionButton label="View All Orders" onClick={() => navigate('OrderList')} className="button-ghost" icon="📦" />
                            </div>
                        </div>

                        <div className="card" style={{ cursor: 'default' }}>
                            <div className="card-header" style={{ backgroundColor: 'var(--status-grey)' }}>Completed Deliveries</div>
                            <div className="card-body">
                                {supplierOrders.filter(o => o.status === 'DELIVERED' || o.status === 'CUSTOMER_PICKED' || o.status === 'COMPLETED').length > 0 ? (
                                    supplierOrders.filter(o => o.status === 'DELIVERED' || o.status === 'CUSTOMER_PICKED' || o.status === 'COMPLETED').slice(0, 5).map(order => (
                                        <div key={order.id} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate('OrderDetail', order.id, 'Order')}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color-dark)' }}>{order.id}: {order.title}</p>
                                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-color-light)' }}>Delivered: {new Date(order.deliveryDate).toLocaleDateString()}</p>
                                            </div>
                                            <StatusBadge status={order.status} />
                                        </div>
                                    ))
                                ) : (
                                    <p>No completed deliveries.</p>
                                )}
                            </div>
                            <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
                                <ActionButton label="View All Orders" onClick={() => navigate('OrderList')} className="button-ghost" icon="📦" />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};


// --- Main App Component (App.jsx) ---
function App() {
    const [currentUser, setCurrentUser] = useState(null); // { id: 'bu1', name: 'Alice Smith', role: 'Business User' }
    const [currentScreen, setCurrentScreen] = useState({ name: 'Login', id: null, type: null });
    const [screenHistory, setScreenHistory] = useState([]); // Stores { name, id, type } objects
    const [toastNotifications, setToastNotifications] = useState([]);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        document.body.classList.toggle('dark-mode', darkMode);
    }, [darkMode]);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToastNotifications(prev => [...prev, { id, message, type }]);
    };

    const dismissToast = (id) => {
        setToastNotifications(prev => prev.filter(toast => toast.id !== id));
    };

    const handleLogin = (user) => {
        setCurrentUser(user);
        // Default navigation based on role
        if (user.role === 'Business User' || user.role === 'Procurement Officer') {
            setCurrentScreen({ name: 'Dashboard', id: null, type: null });
        } else if (user.role === 'Supplier') {
            setCurrentScreen({ name: 'SupplierPortal', id: user.id, type: 'Supplier' });
        }
        setScreenHistory([]); // Clear history on login
        addToast(`Welcome, ${user.name}! You are logged in as ${user.role}.`, 'success');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentScreen({ name: 'Login', id: null, type: null });
        setScreenHistory([]);
        addToast('You have been logged out.', 'info');
    };

    const navigate = (screenName, id = null, type = null) => {
        if (screenName === 'back') {
            if (screenHistory.length > 0) {
                const prevScreen = screenHistory[screenHistory.length - 1];
                setCurrentScreen(prevScreen);
                setScreenHistory(prev => prev.slice(0, -1));
            } else {
                // If no history, navigate to dashboard or default
                if (currentUser?.role === 'Business User' || currentUser?.role === 'Procurement Officer') {
                    setCurrentScreen({ name: 'Dashboard', id: null, type: null });
                } else if (currentUser?.role === 'Supplier') {
                    setCurrentScreen({ name: 'SupplierPortal', id: currentUser.id, type: 'Supplier' });
                } else {
                    setCurrentScreen({ name: 'Login', id: null, type: null });
                }
            }
        } else {
            setScreenHistory(prev => [...prev, currentScreen]); // Save current screen to history
            setCurrentScreen({ name: screenName, id, type });
        }
    };

    // RBAC: Check if current user has access to a resource/action
    const canAccess = (resourceType, resourceName) => {
        if (!currentUser) return false;
        const roleRules = RBAC_RULES[currentUser.role];
        if (!roleRules) return false;

        switch (resourceType) {
            case 'dashboards':
                return roleRules.dashboards.includes(resourceName);
            case 'screens':
                return roleRules.screens.includes(resourceName);
            case 'actions':
                return !!roleRules.actions[resourceName];
            case 'data': // For record/field level access, more granular logic needed
                // Example: canAccess('data', 'rfq').own to check if user can see their own RFQ data
                return roleRules.data?.[resourceName];
            default:
                return false;
        }
    };

    const globalSearch = (query) => {
        if (!query) return [];
        const results = [];
        const lowerQuery = query.toLowerCase();

        // Search RFQs
        DUMMY_DATA.rfqs.forEach(rfq => {
            if (canAccess('screens', 'RFQDetail') &&
                (rfq.id.toLowerCase().includes(lowerQuery) || rfq.title.toLowerCase().includes(lowerQuery) || rfq.description.toLowerCase().includes(lowerQuery))) {
                results.push({ label: `RFQ: ${rfq.id} - ${rfq.title}`, screen: 'RFQDetail', id: rfq.id, type: 'RFQ' });
            }
        });

        // Search Orders
        DUMMY_DATA.orders.forEach(order => {
            if (canAccess('screens', 'OrderDetail') &&
                (order.id.toLowerCase().includes(lowerQuery) || order.title.toLowerCase().includes(lowerQuery) || order.poNumber?.toLowerCase().includes(lowerQuery))) {
                results.push({ label: `Order: ${order.id} - ${order.title}`, screen: 'OrderDetail', id: order.id, type: 'Order' });
            }
        });

        // Search Suppliers
        DUMMY_DATA.suppliers.forEach(supplier => {
            if (canAccess('screens', 'SupplierDetail') &&
                (supplier.id.toLowerCase().includes(lowerQuery) || supplier.name.toLowerCase().includes(lowerQuery) || supplier.contactPerson.toLowerCase().includes(lowerQuery))) {
                results.push({ label: `Supplier: ${supplier.id} - ${supplier.name}`, screen: 'SupplierDetail', id: supplier.id, type: 'Supplier' });
            }
        });

        return results.slice(0, 5); // Limit to top 5 results
    };

    const renderScreen = () => {
        switch (currentScreen.name) {
            case 'Login':
                return <LoginScreen onLogin={handleLogin} />;
            case 'Dashboard':
                return <DashboardScreen currentUser={currentUser} navigate={navigate} />;
            case 'RFQList':
                return <RFQListScreen navigate={navigate} />;
            case 'RFQDetail':
                return <RFQDetailScreen rfqId={currentScreen.id} navigate={navigate} />;
            case 'RFQForm':
                return <RFQFormScreen rfqId={currentScreen.id} navigate={navigate} />;
            case 'OrderList':
                return <OrderListScreen navigate={navigate} />;
            case 'OrderDetail':
                return <OrderDetailScreen orderId={currentScreen.id} navigate={navigate} />;
            case 'OrderForm':
                return <OrderFormScreen orderId={currentScreen.id} navigate={navigate} />;
            case 'SupplierList':
                return <SupplierListScreen navigate={navigate} />;
            case 'SupplierDetail':
                return <SupplierDetailScreen supplierId={currentScreen.id} navigate={navigate} />;
            case 'SupplierForm':
                return <SupplierFormScreen supplierId={currentScreen.id} navigate={navigate} />;
            case 'TaskList':
                return <TaskListScreen navigate={navigate} />;
            case 'AuditLog':
                return <AuditLogScreen entityId={currentScreen.id} entityType={currentScreen.type} navigate={navigate} />;
            case 'NotificationCenter':
                return <NotificationCenterScreen navigate={navigate} />;
            case 'SupplierPortal':
                return <SupplierPortal currentUser={currentUser} navigate={navigate} />;
            default:
                return <div className="full-screen-page page-content">
                    <h2 style={{ color: 'var(--status-red)' }}>Error: Screen Not Found</h2>
                    <ActionButton label="Go to Dashboard" onClick={() => navigate('Dashboard')} className="button-primary" />
                </div>;
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setSearchResults(globalSearch(searchQuery));
        }, 300); // Debounce search input
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    return (
        <AuthContext.Provider value={{ currentUser, canAccess, navigate }}>
            <ToastContext.Provider value={{ addToast }}>
                <div className="app-container">
                    {currentUser && (
                        <header className="header">
                            <div className="header-left">
                                <a href="#" onClick={() => navigate('Dashboard')} className="header-logo">TSM</a>
                                <nav className="header-nav">
                                    {(currentUser.role === 'Business User' || currentUser.role === 'Procurement Officer') && canAccess('dashboards', currentUser.role + 'Dashboard') && (
                                        <button className={currentScreen.name === 'Dashboard' ? 'active' : ''} onClick={() => navigate('Dashboard')}>Dashboard</button>
                                    )}
                                    {canAccess('screens', 'RFQList') && <button className={currentScreen.name === 'RFQList' ? 'active' : ''} onClick={() => navigate('RFQList')}>RFQs</button>}
                                    {canAccess('screens', 'OrderList') && <button className={currentScreen.name === 'OrderList' ? 'active' : ''} onClick={() => navigate('OrderList')}>Orders</button>}
                                    {canAccess('screens', 'SupplierList') && <button className={currentScreen.name === 'SupplierList' ? 'active' : ''} onClick={() => navigate('SupplierList')}>Suppliers</button>}
                                    {canAccess('screens', 'TaskList') && <button className={currentScreen.name === 'TaskList' ? 'active' : ''} onClick={() => navigate('TaskList')}>Tasks</button>}
                                    {canAccess('screens', 'AuditLog') && <button className={currentScreen.name === 'AuditLog' ? 'active' : ''} onClick={() => navigate('AuditLog')}>Audit</button>}
                                    {currentUser.role === 'Supplier' && canAccess('screens', 'SupplierPortal') && (
                                        <button className={currentScreen.name === 'SupplierPortal' ? 'active' : ''} onClick={() => navigate('SupplierPortal')}>My Portal</button>
                                    )}
                                </nav>
                            </div>
                            <div className="header-right">
                                <div className="global-search-container">
                                    <input
                                        type="text"
                                        placeholder="Global Search..."
                                        className="global-search-input"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setSearchResults(globalSearch(searchQuery))}
                                        onBlur={() => setTimeout(() => setSearchResults([]), 100)} // Hide results after a delay
                                    />
                                    {searchResults.length > 0 && searchQuery && (
                                        <div className="search-results-dropdown">
                                            {searchResults.map(result => (
                                                <div key={`${result.screen}-${result.id}`} onClick={() => { navigate(result.screen, result.id, result.type); setSearchResults([]); setSearchQuery(''); }}>
                                                    {result.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="user-profile">
                                    <span>Hello, <strong>{currentUser.name}</strong> ({currentUser.role})</span>
                                </div>
                                <ActionButton label={darkMode ? '☀️' : '🌙'} onClick={() => setDarkMode(!darkMode)} className="button-ghost" />
                                <ActionButton label="Logout" onClick={handleLogout} className="button-secondary" />
                            </div>
                        </header>
                    )}
                    <main className="main-content">
                        {renderScreen()}
                    </main>
                    <div className="toast-container">
                        {toastNotifications.map(toast => (
                            <ToastNotification key={toast.id} {...toast} onDismiss={dismissToast} />
                        ))}
                    </div>
                </div>
            </ToastContext.Provider>
        </AuthContext.Provider>
    );
}

export default App;