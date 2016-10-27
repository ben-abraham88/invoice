'use strict';

invoicesUnlimited.controller('SalesByCustomerController',
	['$scope', '$state', '$controller', '$q', 'userFactory', 'reportsService', 'reportsCommon', 'currencyFilter',
function($scope, $state, $controller, $q, userFactory, reportsService, reportsCommon, currencyFilter) {

if(! userFactory.entity.length) {
	console.log('User not logged in');
	return undefined;
}

var user = userFactory.entity[0];
var organization = user.get("organizations")[0];
$controller('DashboardController',{$scope:$scope,$state:$state});
loadSetData();

function loadSetData() {
	$scope.dateRanges = reportsCommon.getDateRanges();
	$scope.selectedDateRange = $scope.dateRanges[1];
	$scope.fromDate = new Date();
	$scope.toDate = new Date();

//	var promises = [];
//	var p = undefined;

//	p =
	userFactory.getField('dateFormat')
	.then(function(obj) {
		$scope.dateFormat = obj;
		$scope.generateReport();
	});
/*	promises.push(p);

	p = $q.when(coreFactory.getAllCustomers())
	.then(function(res) {
		$scope.customers = res;
	});
	promises.push(p);

	$q.all(promises)
	.then(function() {
		hideLoader();
	});
*/
}

$scope.dateRangeChanged = function() {
	reportsCommon.dateRangeChanged({
		_scope : $scope
	});
}

$scope.openDatePicker = function(n) {
	reportsCommon.openDatePicker({
		_scope : $scope,
		n : n
	});
}

$scope.generateReport = function() {
	showLoader();
	var params = {
		fromDate : $scope.fromDate,
		toDate : $scope.toDate,
		organization : organization
	//	customers : $scope.customers
	};

	$q.when(reportsService.salesByCustomer(params))
	.then(function(invoices) {
		var ids = [];
		var info = {};
		var totalSales = 0;
		var totalInvoices = 0;
		invoices.forEach(function(invoice) {
			var customerId = invoice.customer.id;
			var subAmount = invoice.entity.total;
			if(info[customerId]){
				info[customerId].amount += subAmount;
				info[customerId].count += 1;
			} else {
				info[customerId] = {
					name : invoice.customer.displayName,
					amount : subAmount,
					count : 1
				};
				ids.push(customerId);
			}
			totalSales += subAmount;
		});

		ids.forEach(function(id) {
			info[id].amountStr = currencyFilter(info[id].amount, '$', 2);
			totalInvoices += info[id].count;
		});

		$scope.infoObj = info;
		$scope.ids = ids;
		$scope.totalInvoices = totalInvoices;
		$scope.totalSalesStr = currencyFilter(totalSales, '$', 2);
		
		var dateFormat = $scope.dateFormat.toUpperCase().replace(/E/g, 'd');
		$scope.fromDateStr = formatDate($scope.fromDate, dateFormat);
		$scope.toDateStr = formatDate($scope.toDate, dateFormat);

		hideLoader();
	});
}

}]);