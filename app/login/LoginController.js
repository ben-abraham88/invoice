'use strict';

String.prototype.capitilize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

invoicesUnlimited.controller('LoginController',['$scope','$state','userFactory',
	function($scope,$state,userFactory){

	$scope.username = "";
	$scope.password = "";

	if (userFactory.authorized()) {
		$state.go('dashboard');
	}

	$scope.signUpAction = function(){
		$state.go('signup');
	}

	$scope.signInAction = function(){
		userFactory.login({
			username : $scope.username,
			password : $scope.password
		},function(){
			$('.errorMessage').html('').hide();
			$state.go('dashboard');
		},function(error){
			$('.errorMessage').html(error.capitilize()).show();
			$('.input-container').css({'border':'1px solid red'});
			//$('.input-container input').val('');
		});
	}

}]);
