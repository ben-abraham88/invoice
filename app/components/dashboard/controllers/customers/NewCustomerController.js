'use strict';

invoicesUnlimited.controller('NewCustomerController',
	function($scope,$rootScope,$state,userFactory,
			 contactPersonFactory,customerFactory,$controller,$q){

	var user = userFactory;
	
	if (!user.entity.length) {
		$state.go('login');
		return;
	}

	var mobileOptions = {
		onKeyPress : function(cep,e,field,options){
			var masks = ['9 (999) 999-9999','(999) 999-9999'];
			var mask = cep[0] == "1" ? masks[0] : masks[1];
			$('#mobilePhone').mask(mask,options);
		}
	}

	$('#workPhone').mask('(999) 999-9999');
	$('#mobilePhone').mask('9 (999) 999-9999',mobileOptions);

	var def = $q.defer();

	var address = {
		"Street" 			: "",
		"Fax" 				: "",
		"City" 				: "",
		"Zip/Postal Code"	: "",
		"Country" 			: "",
		"State/Province" 	: ""
	};

	$controller('DashboardController',{$scope:$scope,$state:$state});

	var Customer = Parse.Object.extend("Customer");

	$scope.newCustomer = new customerFactory(new Customer());
	$scope.newCustomer.entity.set('userID',user.entity[0]);

	$scope.newCustomer.billingAddress = Object.create(address);

	$scope.newCustomer.shippingAddress = Object.create(address);

	$scope.shipping = {
		setShippingTheSame  : false,
		tempShippingAddress : {}
	}

	$scope.setShippingAddress = function(){
		if ($scope.newCustomer && !$scope.shipping.setShippingTheSame) {
			$scope.newCustomer.shippingAddress = 
				$scope.shipping.tempShippingAddress;
			return;
		}
		if ($scope.newCustomer) {
			
			$scope.shipping.tempShippingAddress = 
				$scope.newCustomer.shippingAddress;

			$scope.newCustomer.shippingAddress = 
				$.extend(true,{},$scope.newCustomer.billingAddress);

		}
	}

	$scope.saveCustomer = function(){

		var form = document.getElementById('new-customer-form');
		if (!form.reportValidity()) return;

		showLoader();

		$scope.newCustomer.entity.billingAddress = JSON.stringify(
			$scope.newCustomer.billingAddress);

		$scope.newCustomer.entity.shippingAddress = JSON.stringify(
			$scope.newCustomer.shippingAddress);

		var ContactPerson = Parse.Object.extend('ContactPerson');
		var contact = new contactPersonFactory(new ContactPerson());
		var cust = $scope.newCustomer;
		contact.entity.set('userID',user.entity[0]);
		contact.entity.set('defaultPerson',1);
		['email','phone','mobile','lastName','firstName','salutaion']
		.forEach(function(el){
			contact.entity[el.toLowerCase()] 
			= $scope.newCustomer.entity[el];
		})
		
		contact.save()
		.then(function() {
			$scope.newCustomer.entity.add('contactPersons',contact.entity);
			$scope.newCustomer.entity.set('organization',user.entity[0].get('selectedOrganization'));
			$scope.newCustomer.save()
			.then(function(){
			
				$scope.newCustomer = new customerFactory(new Customer());
				$scope.newCustomer.entity.set('userID',user.entity[0]);
				
				$scope.newCustomer.billingAddress = Object.create(address);
				$scope.newCustomer.shippingAddress = Object.create(address);
				hideLoader();

				$state.go('dashboard.customers.all');
			});
		});

	}

	$scope.cancelSaveCustomer = function(){
		$state.go('dashboard.customers.all');
	}

});