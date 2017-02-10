'use strict';

invoicesUnlimited.controller('SignatureController',
	['$rootScope','$scope','$state','signUpFactory','$ocLazyLoad',
	function($rootScope,$scope,$state,signUpFactory,$ocLazyLoad){

	var user = signUpFactory.getFactory('User');

	if (!user.entity.length) {
		$state.go('signup');
		return;
	}

	if($rootScope.fromPaymentSettings) {
		var userObj = user.entity[0];
		signUpFactory.setField('User', 'fullName', userObj.get('fullName'));
		signUpFactory.setField('Signature', 'userID', userObj);
		signUpFactory.setField('Signature', 'organization',
			userObj.get('selectedOrganization'));

		showLoader();
		signUpFactory.getFactory('Role').load()
		.then(function() {
			hideLoader();

		}, function(error) {
			hideLoader();
			console.log(error.message);
		});
	}

	$('#sig').signature();
	$("#clear").click(function(){$("#sig").signature("clear")});
	$scope.fullName = signUpFactory.getField('User', 'fullName');
	$('h2.text-uppercase').css({padding:'50px 0',margin:0});
	$('.signature').css({height:$(window).height()-$('.sticky-nav').height() - parseInt($('.sticky-nav').css('padding-top'))*2 - 1});

	$scope.submitSignature = function(){
		var a = false, b = false;
		$('#sigForm').validate().resetForm();
		if ($('#sig').signature("isEmpty")) {
			$('#sigForm').validate().showErrors({
				'sigError' : 'Please provide signature'
			});
		} else a = true;

		if(! $('input[name="agree-box"]:checked').length) {
			$('#sigForm').validate().showErrors({
				'agree-box' : 'Please agree to the Terms'
			});
		} else b = true;

		if(! (a && b)) return;

		showLoader();

		var sigData = $('.kbw-signature canvas')[0].toDataURL().replace("data:image/png;base64,","");

		signUpFactory.setField('Signature',{
			field : "imageName",
			value : "Signature_" + user.entity[0].id
		});

		signUpFactory.setField('Signature',{
			field : "imageFile",
			value : new Parse.File("Signature.png", { base64 : sigData})
		});

		var signature = signUpFactory.create('Signature');

		if (!signature) {
			$state.go('signup');
			return;
		}

		signature.then(function(obj){
			var save = signUpFactory.save('User',{
				'signatureImage' : signUpFactory.getFactory('Signature').entity[0]
			});
			if (save) return save;
			window.reload();
		},function(error){
			console.log(error.messge);
		}).then(function(){
			//hideLoader();
            debugger;
            var currentUser = user.entity[0];
            var bsnsInfo = currentUser.get('businessInfo');
            var principalInfo = currentUser.get('principalInfo');
            var accountInfo = currentUser.get('accountInfo');
            
            var lastName = undefined;
            var firstName = undefined;
            if(currentUser.fullName){
                firstName = currentUser.fullName.split(' ')[0];
                if(currentUser.fullName.split(' ').length > 1)
                    lastName = $scope.fullName.split(' ')[1];
            }

            $.ajax({
                method:"POST",
                type:"POST",
                url: IRIS,
                data: { 
                    'originator' : IRIS_ORIGINATOR,
                    'source' : IRIS_SOURCE,
                    'DBA' : currentUser.get('company'),
                    'Email' : currentUser.get('email'),
                    'userId' : currentUser.id,
                    'Location Address'	: bsnsInfo.get('streetName'),
                    'Mailing Address'	: bsnsInfo.get('streetName'),
                    'Location'			: bsnsInfo.get('streetName'),
                    'Mailing'			: bsnsInfo.get('streetName'),
                    'Location State'	: bsnsInfo.get('state'),
                    'Mailing State'		: bsnsInfo.get('state'),
                    'Location ZIP'		: bsnsInfo.get('zipCode'),
                    'Mailing ZIP'		: bsnsInfo.get('zipCode'),
                    'Location City'		: bsnsInfo.get('city'),
                    'Mailing City'		: bsnsInfo.get('city'),
                    'Location_Phone'	: bsnsInfo.get('phoneNumber'),
                    'Federal Tax ID'	: bsnsInfo.get('federalTaxID'),
                    'Entity Type'	    : bsnsInfo.get('ownershipType'),
                    'Residence Address'	: principalInfo.get('streetName'),
                    'Residence state'	: principalInfo.get('state'),
                    'Residence zip'		: principalInfo.get('zipCode'),
                    'Residence city'	: principalInfo.get('city'),
                    'Date of Birth'		: principalInfo.get('dob'),
                    'Social Security Number'	: principalInfo.get('ssn'),
                    'Contact_First_Name'	: firstName,
                    'Contact_Last_Name'	: lastName,
                    'Average sales amount'	: accountInfo.get('avgSale'),
                    'Estimated monthly credit and debit card sales'	: accountInfo.get('monthlySales'),
                    'Bank Name'	        : accountInfo.get('bankName'),
                    'Routing #'	        : accountInfo.get('routingNumber'),
                    'DDA #'	            : accountInfo.get('accountNumber'),
                    'Monthly Processing Limit'	: accountInfo.get('monthlySales'),
                    'Business_Volume'	: accountInfo.get('monthlySales'),
                    'Signature-base64'	: sigData,
                    'Lead File'	: sigData,
                    'Signature-name'	: "Signature.png"
                }
            })
            .then(function (result) {
                //console.log("IRIS Lead Submitted");
                debugger;
                hideLoader();
                $state.go('signup.confirm');
            }, function(error){
                //console.error("IRIS Lead Sumission failed");
                debugger;
                hideLoader();
                $state.go('signup.confirm');
            });
            
			//$state.go('signup.confirm');
		},function(error){
			console.log(error.messge);
		});
	}
/*
	$scope.$on('$viewContentLoaded',function($scope){
		// "./assets/js/sig.js"
		// "./assets/js/jquery.ui.touch-punch.min.js"
		$ocLazyLoad.load([
					"./assets/js/excanvas.js",
  					"./assets/js/jquery.signature.js"
					]).then(function() {
						$("#sig").signature(),
						$("#clear").click(function(){$("#sig").signature("clear")}),
						$("#json").click(function(){alert($("#sig").signature("toJSON"))}),
						$("#svg").click(function(){alert($("#sig").signature("toSVG"))})
					});
	});
*/
}]);
