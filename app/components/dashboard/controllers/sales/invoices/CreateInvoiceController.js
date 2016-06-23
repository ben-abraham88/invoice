'use strict';

invoicesUnlimited.controller('CreateInvoiceController',
	['$scope', '$state', '$controller', '$q', 'userFullFactory',
	'invoiceService', 'coreFactory', 'taxFactory', 'expenseService',
	'currencyFilter',
	function($scope, $state, $controller, $q, userFullFactory,
		invoiceService,coreFactory,taxFactory,expenseService,currencyFilter) {

	var user = userFullFactory.authorized();
	var organization = user.get("organizations")[0];
	$controller('DashboardController',{$scope:$scope,$state:$state});

	prepareToCreateInvoice();

	function prepareToCreateInvoice() {
		showLoader();
		var promises = [];
		var p = null;

		p = $q.when(coreFactory.getAllCustomers())
		.then(function(res) {
			$scope.customers = res.sort(function(a,b){
				return alphabeticalSort(a.entity.displayName,b.entity.displayName)
			});
		//	$scope.selectedCustomer = $scope.customers[0];
		});
		promises.push(p);

		p = $q.when(coreFactory.getAllItems({
			organization : organization
		})).then(function(items) {
			$scope.actualItems = items.filter(function(item) {
				return !item.entity.expanseId;
			});
			$scope.expenseItems = items.filter(function(item) {
				return item.entity.expanseId;
			});
			$scope.items = $scope.actualItems;
		});
		promises.push(p);

		p = $q.when(invoiceService.getPreferences(user))
		.then(function(prefs) {
			$scope.prefs = prefs;
		});
		promises.push(p);

		p = $q.when(coreFactory.getUserRole(user))
		.then(function(role) {
			$scope.userRole = role;
		});
		promises.push(p);

		p = taxFactory.getTaxes(user, function(taxes) {
			$scope.taxes = taxes;
		});
		promises.push(p);

		$q.all(promises).then(function() {
			prepareForm();
			hideLoader();

			//--


		}, function(error) {
			console.log(error.message);
		});

	}

	function prepareForm() {
		if($scope.prefs.numAutoGen == 1) {
			$scope.invoiceNo = $scope.prefs.invoiceNumber;
			$scope.disableInvNo = true;
		} else {
			$scope.invoiceNo = "";
			$scope.disableInvNo = false;
		}

		$scope.paymentTerms = {
			terms : [
				{name: "Due on Receipt", value : 1},
				{name: "Off", 			 value : 0}
			],
			selectedTerm : {name: "Due on Receipt", value : 1}
		};

		$scope.hasDueDate = true;
		$scope.todayDate = new Date();
		$scope.calculateDueDate();
		$scope.subTotalStr = currencyFilter(0, '$', 2);

		switch($scope.prefs.discountType) {
			case 0:
				$scope.itemLevelTax = false;
				$scope.invoiceLevelTax = false;
				break;

			case 1:
				$scope.itemLevelTax = true;
				$scope.invoiceLevelTax = false;
				break;

			case 2:
			case 3:
				$scope.itemLevelTax = false;
				$scope.invoiceLevelTax = true;
				$scope.discountStr = currencyFilter(0, '$', 2);
				break;
		}

		if ($scope.prefs.shipCharges) {
			$scope.showShippingCharges = true;
			$scope.shippingChargesStr = currencyFilter(0, '$', 2);
		}

		if ($scope.prefs.adjustments) {
			$scope.showAdjustments = true;
			$scope.adjustmentsStr = currencyFilter(0, '$', 2);
		}

		if ($scope.prefs.salesPerson)
			$scope.showSalesPerson = true;

		// put first item placeholder
		$scope.invoiceItems = [{
			selectedItem : undefined,
			selectedTax : undefined,
			rate : 0,
			quantity : 1,
			discount : 0,
			amount : 0
		}];

	}

	function saveInvoice() {
		var invoice = {
			userID : user,
			organization : organization,
			customer : $scope.selectedCustomer.entity,
			invoiceDate : $scope.todayDate,
			invoiceNumber : $scope.invoiceNo,
			status : "Unpaid",
			discountType : $scope.prefs.discountType,
			discounts : $scope.discount,
			shippingCharges : $scope.shippingCharges,
			adjustments : $scope.adjustments,
			subTotal : Number($scope.subTotal),
			total : Number($scope.total),
			balanceDue : Number($scope.total),
			poNumber : $scope.poNumber,
			salesPerson : $scope.salesPerson,
			notes : $scope.notes || $scope.prefs.notes,
			terms : $scope.terms || $scope.prefs.terms

		};
		if ($scope.paymentTerms.selectedTerm.value == 1)
			invoice.dueDate = $scope.dueDate;
		var email = $scope.selectedCustomer.entity.email;
		if(email) invoice.customerEmails = [email];

		return invoiceService.createNewInvoice
			(invoice, $scope.invoiceItems, $scope.userRole, $scope.filepicker);
	}

	function saveAndSendInvoice() {
		return saveInvoice()
		.then(function(invoice) {
			return invoiceService.copyInInvoiceInfo(invoice)
			.then(function(invoiceInfo) {
				return invoiceService.createInvoiceReceipt(invoice.id, invoiceInfo.id);
			})
			.then(function(invoiceObj) {
				return invoiceService.sendInvoiceReceipt(invoiceObj);
			});
		});
	}

	$scope.save = function() {
		showLoader();
		saveInvoice()
		.then(function(invoice) {
			hideLoader();
			console.log(invoice);
			$state.go('dashboard.sales.invoices.all');

		}, function (error) {
			hideLoader();
			console.log(error.message);
		});
	}

	$scope.saveAndSend = function () {
		showLoader();
		saveAndSendInvoice()
		.then(function(invoice) {
			hideLoader();
		//	console.log(invoice);

			$state.go('dashboard.sales.invoices.all');

		}, function (error) {
			hideLoader();
			console.log(error);
		});
	}

	$scope.cancel = function() {
		$state.go('dashboard.sales.invoices.all');
	}

	$scope.calculateDueDate = function() {		
		var d = new Date($scope.todayDate);
		d.setHours(d.getHours() + 12);
		$scope.dueDate = d; //$.format.date(d, "MM/dd/yyyy");
	}

	$scope.paymentTermsChanged = function() {
		$scope.hasDueDate =
			$scope.paymentTerms.selectedTerm.value == 1 ? true : false;

		if($scope.hasDueDate)
			$scope.calculateDueDate();
	}

	$scope.openDatePicker = function(n) {
		switch (n) {
			case 1: $scope.openPicker1 = true; break;
			case 2: $scope.openPicker2 = true; break;
		}
  	}

	$scope.addInvoiceItem = function() {
		$scope.invoiceItems.push({
			selectedItem : undefined,
			selectedTax : undefined,
			rate : 0,
			quantity : 1,
			discount : 0,
			taxValue : 0,
			amount : 0
		});
	}

	$scope.reCalculateTotal = function() {
		var subTotal = Number($scope.subTotal) || 0;
		var discount = Number($scope.discount) || 0;
		var shipCharges = Number($scope.shippingCharges) || 0;
		var adjustments = Number($scope.adjustments) || 0;
		var totalTax = Number($scope.totalTax) || 0;
		var sum = subTotal + totalTax;
		var discountRatio = (100 - discount) * 0.01;

		if($scope.prefs.discountType == 2) // before tax
			sum = (subTotal * discountRatio) + totalTax;
		else if ($scope.prefs.discountType == 3) // after tax
			sum = (subTotal + totalTax) * discountRatio;

		discount = Math.abs(sum - subTotal - totalTax);
		$scope.total = sum + shipCharges + adjustments;
		$scope.discountStr = currencyFilter(discount, '$', 2);
		$scope.shippingChargesStr = currencyFilter(shipCharges, '$', 2);
		$scope.adjustmentsStr = currencyFilter(adjustments, '$', 2);
		$scope.totalStr = currencyFilter($scope.total, '$', 2);
	}

	function reCalculateSubTotal() {
		var items = $scope.invoiceItems;
		var subTotal = 0;
		var totalTax = 0;

		// no need to check discountType,
		// itemInfo.discount is zero, so, expression will evaluate to 1.
		items.forEach(function(item) {
			subTotal += item.amount * ((100 - item.discount) * 0.01);
			item.taxValue = calculateTax(item.amount, item.selectedTax);
			totalTax += item.taxValue;
		});

		$scope.totalTax = totalTax;
		$scope.subTotal = subTotal;
		$scope.subTotalStr = currencyFilter(subTotal, '$', 2);
		$scope.reCalculateTotal();
	}

	$scope.reCalculateItemAmount = function(index) {
		var itemInfo = $scope.invoiceItems[index];
		if (! itemInfo.selectedItem) return;

		itemInfo.amount = itemInfo.rate * itemInfo.quantity;
		reCalculateSubTotal();
	}

	$scope.removeInvoiceItem = function(index) {
		if ($scope.invoiceItems.length > 1) {
			$scope.invoiceItems.splice(index,1);
			reCalculateSubTotal();

		} else {
		/*	var item = $scope.invoiceItems[0];
			item.selectedItem = undefined,
			item.selectedTax = undefined,
			item.rate = 0,
			item.quantity = 1,
			item.discount = 0,
			item.taxValue = 0,
			item.amount = 0

			$scope.totalTax = 0;
			$scope.subTotal = 0;
			$scope.subTotalStr = currencyFilter(0, '$', 2);
			$scope.reCalculateTotal();
		*/	console.log("there should be atleast 1 item in an invoice");
		}
	}

	$scope.itemChanged = function(index) {
		console.log('item changed');
		var itemInfo = $scope.invoiceItems[index];
		itemInfo.rate = Number(itemInfo.selectedItem.entity.rate);
		var tax = itemInfo.selectedItem.tax;
		if (!tax) {
		//	console.log("no tax applied");
			itemInfo.selectedTax = "";
		} else {
			var taxes = $scope.taxes;
			for (var i = 0; i < taxes.length; ++i) {
				if (tax.id == taxes[i].id) {
					itemInfo.selectedTax = taxes[i];
					break;
				}
			}
		}
		$scope.reCalculateItemAmount(index);
	}

	$scope.customerChanged = function() {
		showLoader();
		$q.when(expenseService.getCustomerExpenses({
			organization : organization,
			customer : $scope.selectedCustomer.entity
		}))
		.then(function(custExpenses) {
		//	console.log(custExpenses);
			// filter current customer's expenses from all expenses
			var custExpenseItems = [];
			for (var i = 0; i < custExpenses.length; ++i) {
				for (var j = 0; j < $scope.expenseItems.length; ++j) {
					if (custExpenses[i].entity.id == $scope.expenseItems[j].entity.expanseId) {
						custExpenseItems.push($scope.expenseItems[j]);
					}
				}
			}
		//	console.log(custExpenseItems);
			// check is any expense has updated
			var newExpenseItems = [];
			for(var i = 0; i < custExpenses.length; ++i) {
				var exp = custExpenses[i].entity;
				var itemExist = custExpenseItems.some(function(item) {
					return (exp.category == item.entity.title &&
						exp.amount == Number(item.entity.rate));
				});
				if (! itemExist) {
					newExpenseItems.push({
						create : true,
						tax   : exp.tax,
						entity : {
							title : exp.category,
							rate  : String(exp.amount),
							expenseId : exp.id
						}
					});
				}
			}
		//	console.log(newExpenseItems);
			// remove unrelated invoice items
			var newItems = $scope.actualItems.concat(custExpenseItems,newExpenseItems);
			$scope.invoiceItems = $scope.invoiceItems.filter(function(invItem) {
				if(!invItem.selectedItem || invItem.selectedItem.create)
					return false;
				return newItems.some(function(item) {
					return item.entity.id == invItem.selectedItem.entity.id;
				});
			});
		//	console.log($scope.invoiceItems);
			$scope.items = newItems;
			if($scope.invoiceItems.length < 1) {
				$scope.addInvoiceItem();
				$scope.totalTax = 0;
				$scope.subTotal = 0;
				$scope.subTotalStr = currencyFilter(0, '$', 2);
				$scope.reCalculateTotal();

			} else {
				reCalculateSubTotal();
			}
			hideLoader();
		});
	}

	$scope.printSelected = function() {
		/*
		var customerName = 'Olga Olga';
		var amount = currencyFilter(2.3, $, 2);
		var businessName = 'SFS-ds';
		var link = 'http://files.parsetfss.com/e054a587-eac7-4ca9-8f92-86c471415177/tfss-a1cb4ab3-63af-4395-8773-cb03239f3b2b-test2.html';
		
		var emailSubject = 'Invoice From ' + businessName;
		var emailBody = customerName + ',<br/>'
			+ businessName + ' has sent you an invoice of ' + amount
			+ '. <a href="' + link + '">Click here to view.</a>';

		Parse.Cloud.run("sendMailgun", {
			toEmail: "adnan@binaryport.com",
			fromEmail: "no-reply@invoicesunlimited.com",
			subject : emailSubject,
			message : emailBody
		}).then(function(msg) {
			console.log(msg);
		}, function(msg) {
			console.log(msg);
		});
	*/
	}

}]);