'use strict';

invoicesUnlimited.controller('AccountInfoController',['$scope','$state','userFactory','signUpFactory',
	function($scope,$state,userFactory,signUpFactory){

	$.validator.addMethod(
		"AvgSaleRequired",
		function(value,element){
			return value != "avgSaleTitle";
		}
	)

	$("#signUpForm").validate({
		onkeyup : false,
		onfocusout : false,
		rules: {
			avgSale 		: {
				required : true,
				AvgSaleRequired : true
			},
			monthlySales 	: 'required',
			bankName 		: 'required',
			routingNumber	: 'required',
			accountNumber	: 'required'

		},
		messages: {
			avgSale 		: 'Please specify your average sale per customer!',
			monthlySales 	: 'Please specify your estimated montly credit card sales!',
			bankName 		: 'Please specify your bank name!',
			routingNumber	: 'Please specify your bank routing number',
			accountNumber	: 'Please specify your bank account number'			
		}
	});

	$scope.avgSaleList = [];
	var moneyVal = 0;
	do {
		if (!moneyVal) moneyVal = 1;
		else if (moneyVal == 1) moneyVal = 5;
		else if (moneyVal < 100) moneyVal += 5;
		else if (moneyVal < 1000) moneyVal += 50;
		else if (moneyVal < 10000) moneyVal += 500;
		else moneyVal += 5000;
		$scope.avgSaleList.push({value:"$ " + (moneyVal == 50000 ? moneyVal + "+" : moneyVal)});
	} while(moneyVal != 50000)


	if (userFactory.authorized) {
		if (!userFactory.getBusinessInfo()) {
			userFactory.logout();
			$state.go('signup');
		}
	} else $state.go('signup');

	$scope.accountInfo = {
		bankName		: '',
		routingNumber	: '',
		accountNumber	: '',
		avgSale			: '',
		inPerson		: 'inPerson',
		monthlySales	: ''
	};

	$scope.saveAccountInfo = function(){
		if (!$('#signUpForm').valid()) return;

		for (var field in $scope.accountInfo){
			signUpFactory.set({
				table : 'AccountInfo',
				expr  : field + ":" + $scope.accountInfo[field]
			});
		}

		signUpFactory.set({
			table 	: 'AccountInfo',
			expr	: 'inPerson:' + ($scope.accountInfo['inPerson'] == 'inPerson'? 'true':'false')
		});

		signUpFactory.setObject({
			table 	: 'AccountInfo',
			params  : {
				field : "userID",
				value : signUpFactory.getParse("_User")
			}
		});

		signUpFactory.Save({
			tableName : 'AccountInfo',
			callback  : function(){
				if (!userFactory.authorized) return;
				signUpFactory.Save('User',{
					accountInfo : signUpFactory.getParse("AccountInfo")
				},function(){
					$state.go('signup.signature');
				});
			}
		});
	};

	$scope.saveAndContinueLater = function(){
		if (!userFactory.authorized){
			var user = signUpFactory.getParse('_User');
			userFactory.login({
				username : user.get('username'),
				password : user.get('password'),
			},function(){
				$state.go('dashboard');
			});
		}
		else $state.go('dashboard');
	};

}]);
