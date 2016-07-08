'use strict';

$(document).ready(function(){

	$.validator.addMethod(
		"NotFullName",
		function(value,element){
			var words = value.match(/[^ ]+/g);
			
			if (words.length == 1) return false;

			var fullname = words.reduce(function(res,current,index){
				return res + (index ? " ":"") + current.capitalize();
			},"");

			$(element).val(fullname);
			return true;
		},''
	);

	$.validator.addMethod(
		"CountryNotSelected",
		function(value,element){
			return (value != '' && value != 'Select Country');
		}
	);

	$.validator.addMethod(
		"ConfirmPassMatch",
		function(value,element){
			return value == $("input[name='password']").val();
		},''
	);

	$.validator.addMethod(
		"UserNameExists",
		function(value,element){
			return !parseInt($('#username-exists').val());
		},''
	);

	$.validator.addMethod(
		"EmailExists",
		function(value,element){
			return !parseInt($('#email-exists').val());
		},''
	);

});

invoicesUnlimited.controller('SignupController',
	['$scope','$state','signUpFactory','userFactory',
	function($scope,$state,signUpFactory,userFactory){

	if (userFactory.entity.length &&
		!signUpFactory.getVerification.code()) {
		showLoader();
		userFactory.logout().then(function(){
			hideLoader();
		});
	}

	$('#phone').mask("(Z00) 000-0000",{
		translation : {
			'Z': {
				pattern : /[2-9]/g
			}
		}
	});

	var showIndexInfo = function(){
		if ($('.extended-signup').css({'display':'none'}))
			$('.extended-signup').show();
		if ($.inArray($scope.selectedCountry, $scope.usaAndCanada) != -1) {
			$('input#email').attr('placeholder',"Email (To Recover Forgotten Password)");
			$('input#phone').attr('placeholder',"Phone Number (Text Verification Required)");
			signUpFactory.setVerification.provider('text');
		} else {
			$('input#email').attr('placeholder',"Email");
			$('input#phone').attr('placeholder',"Phone Number");
			signUpFactory.setVerification.provider('email');
		}
	}

	var signUpCountry = signUpFactory.getField('User','country');
	if (signUpCountry) showIndexInfo();	
	
	$scope.selectedCountry = (signUpCountry == '' ? 'Select Country' : signUpCountry);

	var fields = ['company',
				  'fullName',
				  'email',
				  'username',
				  'password',
				  'phonenumber'];
	
	fields.forEach(function(field){
		$('input[name='+field+']').val(signUpFactory.getField('User',field));
	});

	$("#signUpForm").validate({
		onkeyup : false,
		onfocusout : false,
		rules: {
			fullName : {
				NotFullName : true,
				required : true
			},
			company : 'required',
			username: {
				required : true,
				UserNameExists : true
			},
			email : {
				required : true,
				email : true,
				EmailExists : true
			},
			password: {
				required : true,
				minlength : 6
			}, //'required',
			confirmpassword: {
				required : true,
				ConfirmPassMatch : true
			},
			phonenumber : {
				required : true,
				minlength : 14
			}, //'required',
			country : {
				CountryNotSelected : true
			}
		},
		messages: {
			fullName : {
				required : "Please specify your Full Name !",
				NotFullName : "Please Enter Full Name"
			},
			username: {
				required : "Please specify your username !",
				UserNameExists : "The username is already taken!"
			},
			email : {
				required : "Please specify your email !",
				email : "Please write valid email address",
				EmailExists : "The email is already taken!"
			},
			company : "Please specify your company !",
			password: {
				required : "Please specify your password !",
				minlength : "password should contain atleast 6 characters"
			}, //"Please specify your password !",
			confirmpassword: {
				required : "Please specify your confirm password !",
				ConfirmPassMatch : "Passwords do not match!"
			},
			phonenumber : {
				required : "Please specify your phone !",
				minlength : "Phone number should consist of 10 digits"
			}, //: "Please specify your phone !",
			country : {
				CountryNotSelected : "Please select the country!"
			}
		}
	});

	$scope.ValidateForm = function(callback){
		var queryUsername = new Parse.Query(Parse.User);
        queryUsername.equalTo("username",$('input[name=username]').val());

   		var queryEmail = new Parse.Query(Parse.User);
        queryEmail.equalTo("email",$('input[name=email]').val());

        var objectExistCallback = function(object,name) {
        	if(object) $('#'+name+'-exists').val(1);
        	else $('#'+name+'-exists').val(0);
        }

        var usernameP = queryUsername.first().then(function(object){
        	objectExistCallback(object,'username');
        });

        var emailP = queryEmail.first().then(function(object){
        	objectExistCallback(object,'email');
        });

        Parse.Promise
        .when([usernameP, emailP]).then(function(){
        	var validated = $('#signUpForm').valid();
			callback(!parseInt($('#username-exists').val()) && 
					 !parseInt($('#email-exists').val()) && validated);
    	});
	};

	$scope.selectedCountryChanged = function(){
		var validCountry = $('#signUpForm')
							.validate()
							.element('[name=country]');
		
		if (!validCountry) return;
		showIndexInfo();
	};

	$scope.sendMessage = function(){
		showLoader();
		var validCountry = $('#signUpForm')
							.validate()
							.element('[name=country]');

		if (!validCountry) {
			hideLoader();
			return;
		}

		var result = $scope.ValidateForm(function(validated){
			if (!validated) {
				hideLoader();
				return;
			}
	
			fields.forEach(function(field){
				signUpFactory
				.setField('User',field,$('input[name='+field+']').val());
			});

			var handleError = function() {
				var error = {};
				if ($scope.usaAndCanada.includes($scope.selectedCountry)) {
					console.log('invalid phone number');
					error.phonenumber = "phone number does not exist";
				} else {
					console.log('invalid email address');
					error.email = "email address does not exist";
				}
				$("#signUpForm").validate().showErrors(error);
				hideLoader();
			}

			var saveCodeHash = function(res){
				var codeString = res.match(/(Code:([0-9]|[a-f]){32}\;)/g);
				if(codeString == null) {
					handleError();

				} else {
					codeString = codeString[0];
					var code = codeString.match(/[^\;\:]+/g);
					if (!code) {
						console.log('error while generating code, try again');
						hideLoader();

					} else {
						code = code[1];
						signUpFactory.setVerification.code(code);
						signUpFactory.setField('User','country',$scope.selectedCountry);
						hideLoader();
						$state.go('signup.verification');
					}
				}

			}

			var postParams = {};

			if ($scope.usaAndCanada.includes($scope.selectedCountry)) {
				postParams.dest = 'phone';
				postParams.phonenumber = $('#phone').val();
			} else {
				postParams.dest = 'email';
				postParams.email = $('input[name=email]').val();
			}

			$.post('./assets/php/sendVerificationCode.php',
				postParams,
				saveCodeHash);
		});
	};

	$scope.usaAndCanada = ["United States of America","Canada"];

	$scope.otherCountries = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei Darussalam","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Cфte d'Ivoire","Croatia","Cuba","Cyprus","Czech Republic","Democratic People's Republic of Korea (North Korea)","Democratic Republic of the Cong","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Lao People's Democratic Republic (Laos)","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia (Federated States of)","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","Norway","Oman","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Republic of Korea (South Korea)","Republic of Moldova","Romania","Russian Federation","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Swaziland","Sweden","Switzerland","Syrian Arab Republic","Tajikistan","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom of Great Britain and Northern Ireland","United Republic of Tanzania","Uruguay","Uzbekistan","Vanuatu","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];
}]);
