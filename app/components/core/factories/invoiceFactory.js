'use strict';

invoicesUnlimited.factory('invoiceFactory',function(userFactory, invoiceItemFactory) {

var user = userFactory;
if (!user) return undefined;

function Invoice(parseObject, params) {
	if (!parseObject) return undefined;
	var invoiceFields;

	if(params.operation === "listInvoices") {
		invoiceFields = [
			"invoiceNumber", "invoiceDate",
			"dueDate", "total", "balanceDue",
			"status"
		];
		var customer = parseObject.get("customer");
		if (customer) {
			var customerFields = ["displayName"];
			setObjectOperations({
				object 		: customer,
				fieldName	: undefined,
				parent 		: undefined,
				fields 		: customerFields
			});
		//	this.customerFields = customerFields;
			this.customer = customer;
		}

	} else if (params.operation === "getInvoice") {
		invoiceFields = [
			'customer', 'invoiceDate', 'dueDate',
			'invoiceNumber', 'status', 'invoiceFiles',
			'invoiceInfo', 'adjustments', 'discountType',
			'discounts', 'shippingCharges', 'balanceDue',
			'subTotal', 'total', 'notes', 'terms', 'poNumber',
			'salesPerson'
		];
		var invoiceItems = parseObject.get('invoiceItems');
		if (invoiceItems)
			invoiceItems = invoiceItems.map(function(elem){
				var item = new invoiceItemFactory(elem);
				return item;
			});
		this.invoiceItems = invoiceItems;
	} else if (params.operation == 'sendReceipt') {
		invoiceFields = [
			'balanceDue' ,'invoiceReceipt', 'customerEmails'
		];
		var customer = parseObject.get("customer");
		if (customer) {
			setObjectOperations({
				object 		: customer,
				fieldName	: undefined,
				parent 		: undefined,
				fields 		: ["displayName"]
			});
			this.customer = customer;
		}
		var orgObj = parseObject.get("organization");
		if(orgObj) {
			setObjectOperations({
				object 		: orgObj,
				fieldName	: undefined,
				parent 		: undefined,
				fields 		: ["name"]
			});
			this.organization = orgObj;
		}
	}

	setObjectOperations({
		object 		: parseObject,
		fieldName	: undefined,
		parent 		: undefined,
		fields 		: invoiceFields
	});

//	this.id = parseObject.id;
	this.entity = parseObject;
//	this.invoiceFields = invoiceFields;
};

return Invoice;
});