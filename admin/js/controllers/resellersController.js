'use strict';

clientAdminPortalApp.controller('resellersController',[
	'$q', '$scope', '$state', '$modal', 'userRecordFactory', 'accountInfoFactory', 'businessInfoFactory', 'signatureFactory', 'principalInfoFactory', 'organizationFactory', 'currencyFactory', 'projectUserFactory', 'preferencesFactory',
	function($q,$scope, $state, $modal, userRecordFactory, accountInfoFactory, businessInfoFactory, signatureFactory,principalInfoFactory,organizationFactory,currencyFactory,projectUserFactory,preferencesFactory) {

		if (Parse.User.current()) {
			if(!(Parse.User.current().get("isReseller") || (Parse.User.current().authenticated() && $state.params.resellerId)))
				$state.go("home");
		} else {
			$state.go("login");
		}

		var currentUser;



		$scope.sessionUsername = Parse.User.current().get("fullName");

		$scope.logOut = function() {
			Parse.User.logOut();
			$scope.authenticated = false;
			$scope.sessionUsername = '';
			$state.go('login');
		};



		/*****************************************************************************/


		$('.phonenumber').mask("(Z00) 000-0000",{
			translation : {
				'Z': { pattern : /[2-9]/g }
			}
		});

		$scope.records = [];
		$scope.adminUsers = [];
		$scope.adminIds = [];

		$scope.currentRecord = undefined;

		$scope.query = "";
		$scope.lastUsedQuery = null;
		$scope.lastUsedQuerySkip = 0;
		$scope.paginating = false;
		$scope.queryChunkSize = 20;
		$scope.lastUsedQueryGotAll = false;

		$scope.allResellers = [];

		$scope.gatewayTypeNames = {
			'': 'None',
			'1': 'Epn',
			'2': 'Auth. Net',
			'3': 'Pivotal'
		};

		$scope.statesAbbr = [
			"AL", "AK", "AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID",
			"IL", "IN", "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO",
			"MT", "NE", "NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA",
			"RI", "SC", "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
		];

		$scope.countryNames = {
			'': 'Select country',
			'usa': 'USA',
			'ukraine': 'Ukraine',
			'poland': 'Poland'
		};

		function loadQuery(){
			$scope.paginating = true;
			$scope.lastUsedQuery.skip($scope.lastUsedQuerySkip);
			$scope.lastUsedQuery.find({
				success: function(list) {
					console.log("successfull load of " + list.length + " elements with skip " + $scope.lastUsedQuerySkip);
					$scope.$apply(function() {
						for (var i = 0; i < list.length; i++) {

							(function(record) {
								var paymentsQuery = new Parse.Query("Payment");
								paymentsQuery.equalTo("userID", list[i]);
								paymentsQuery.equalTo("mode", "Credit Card");
								paymentsQuery.find()
									.then(function(objs){

									var visa = 0;
									var masterCard = 0;
									var amex = 0;
									var discover = 0;
									var other = 0;

									var month = (new Date()).getMonth() + 1;
									var year = (new Date()).getFullYear();

									var startDate = new Date(year, 0, 1, 0, 0, 1, 1);
									var endDate = new Date(year, month, 1, 0, 0, 0, 0);
									var payments = objs.filter(function(obj){
										return obj.get('date') >= startDate && obj.get('date') < endDate;
									});

									payments.forEach(function(payment){
										var fourdigits = payment.get('firstFourDigits');
										if(fourdigits.startsWith('4')){
											visa += payment.get('amount');
										} 
										else if(fourdigits.startsWith('5')){
											masterCard += payment.get('amount');
										}
										else if(fourdigits.startsWith('6')){
											discover += payment.get('amount');
										}
										else if(fourdigits.startsWith('30') || fourdigits.startsWith('34') || fourdigits.startsWith('36') || fourdigits.startsWith('37') || fourdigits.startsWith('38') || fourdigits.startsWith('39')){
											amex += payment.get('amount');
										}
										else{
											other += payment.get('amount');
										}
									});

									$scope.$apply(function() {
										record.oldUsername = record.username;
										record.allPayments = objs;
										record.month = month;
										record.year = year;
										var total = visa + masterCard + amex + discover + other;

										record.visa = "$" + visa.toFixed(2);
										record.masterCard = "$" + masterCard.toFixed(2);
										record.amex = "$" + amex.toFixed(2);
										record.discover = "$" + discover.toFixed(2);
										record.other = "$" + other.toFixed(2);
										record.total = "$" + total.toFixed(2);

									});
								}, function(error){
									if(record.username == "mazhar"){
										debugger;
									}
								});
							})(list[i]);

							if (list[i].businessInfo && list[i].businessInfo.id) {
								(function(record) {
									var busQuery = new Parse.Query('BusinessInfo');
									busQuery.equalTo('objectId', record.businessInfo ? record.businessInfo.id : null);
									busQuery.first()
										.then(function(bus){
										$scope.$apply(function() {
											record.businessInfo  = bus;
											record.businessAssigned = true;

										});
									},function(e){
										console.log("Failed to fetch accout for " + record.fullName + ": " + 
													e.map(function(el){return el.message}).join('\n\r'));
									});
								})(list[i]);
							} else {

							}
							//list[i].paymentGateway = '';
							$scope.records.push(list[i]);
						}
						$scope.lastUsedQuerySkip += list.length;
						$scope.lastUsedQueryGotAll = (list.length < $scope.queryChunkSize);
						$scope.paginating = false;
					});
				}, error: function(error) {
					$scope.$apply(function() {
						$scope.paginating = false;
					});
					console.log(error.message);
				}
			});
		}

		$scope.loadMoreQueryResults = function() {
			
			if(!$scope.lastUsedQuery) return;
			
			if ($scope.paginating == true) return;
			if ($scope.lastUsedQueryGotAll) return;

			loadQuery();
		};

		$scope.updateQueryResults = function() {

			var query;

			userRecordFactory.searchedFields.forEach(function(elem){
				var subQuery = new Parse.Query(userRecordFactory);
				subQuery.contains(elem, $scope.query);
				query = query ? Parse.Query.or(query, subQuery) : subQuery;
			});

			query.equalTo("reseller", currentUser);

			$scope.lastUsedQueryGotAll = false;
			$scope.lastUsedQuerySkip = 0;
			query.limit($scope.queryChunkSize);
			query.include("businessInfo");
			$scope.records = [];
			query.descending("updatedAt");
			$scope.lastUsedQuery = query;
			$scope.loadMoreQueryResults();

		};

		//$scope.updateQueryResults();

		$scope.logOut = function() {
			Parse.User.logOut();
			$scope.authenticated = false;
			$scope.sessionUsername = '';
			$state.go('login');
		};

		$scope.newUserRecord = new userRecordFactory();
		$scope.newUserRecord.set("accountInfo", new accountInfoFactory);
		$scope.newUserRecord.set("businessInfo", new businessInfoFactory);
		$scope.newUserRecord.accountAssigned = true;
		$scope.newUserRecord.paymentGateway = '';
		$scope.newUserRecord.skipApplication = true;

		$scope.userFormValidated = true;
		$scope.userForm = {
			fullName  : true
		}

		$scope.saveAndNotify = function(user,form) {

			$scope.userForm.fullName = true;

			if (!form.fullName.$valid) $scope.userForm.fullName = false;

			if (!form.$valid) return;

			$('.loader-screen').show();

			if(user.paymentGateway){
				if(user.paymentGateway.length < 1){
					user.EPNrestrictKey = "";
					user.EPNusername = "";
					user.AuthKey = "";
					user.AuthNet = "";
				}
			}
			else {
				user.EPNrestrictKey = "";
				user.EPNusername = "";
				user.AuthKey = "";
				user.AuthNet = "";
				user.paymentGateway = "";
			}


			if(user.oldUsername != user.username){
				var projectUser = new Parse.Query("ProjectUser");
				projectUser.equalTo("userName", user.oldUsername);
				projectUser.first()
					.then(function(pUser){
					pUser.set("userName", user.username);
					pUser.save(null, {
						success : function(o){
							debugger;
						}, error : function(response, error){
							debugger;
						}
					});
				});

			}

			user.businessInfo.save(null, {
				success: function(business){
					Parse.Cloud.run('UpdateUser',{
						user : {
							id     : user.id,
							params : {
								merchantID      : user.merchantID,
								company         : user.company,
								fullName        : user.fullName,
								email           : user.email,
								username        : user.username,
								password        : user.get('password'),
								EPNrestrictKey  : user.EPNrestrictKey,
								EPNusername     : user.EPNusername,
								AuthNet         : user.AuthNet,
								AuthKey         : user.AuthKey,
								paymentGateway  : user.paymentGateway.toString(),
								reseller 		: user.reseller.id ? user.reseller.id : "None"
							}
						}
					}).then(function(res){
						$('.loader-screen').hide();
						alert("User was successfuly saved!");
						$scope.updateQueryResults();
					},function(err){
						console.log("User account update failed:" + err.message);
					});
				}, error: function(response, error) {
					Parse.Cloud.run('UpdateUser',{
						user : {
							id     : user.id,
							params : {
								merchantID      : user.merchantID,
								company         : user.company,
								fullName        : user.fullName,
								email           : user.email,
								username        : user.username,
								password        : user.get('password'),
								EPNrestrictKey  : user.EPNrestrictKey,
								EPNusername     : user.EPNusername,
								AuthNet         : user.AuthNet,
								AuthKey         : user.AuthKey,
								paymentGateway  : user.paymentGateway.toString(),
								reseller 		: user.reseller.id ? user.reseller.id : "None"
							}
						}
					}).then(function(res){
						$('.loader-screen').hide();
						alert("User was successfuly saved!");
						$scope.updateQueryResults();
					},function(err){
						console.log("User account update failed:" + err.message);
					});
				}
			});
		}

		$scope.deleteAndNotify = function(record) {
			//if (!confirm("Are you sure want to remove?")) return;

			$("#myModal").css("display" ,"none");

			//var deleting = {id: record.id};
			var org = record.get('selectedOrganization');
			var bus = record.get('businessInfo');
			var acc = record.get('accountInfo');
			var curr = record.get('currency');
			var prin = record.get('principalInfo');
			debugger;
			$('.loader-screen').show();
			var projUser = new Parse.Query("ProjectUser");
			projUser.equalTo("userName", record.get('username'));
			projUser.first()
				.then(function(obj){
				var userRole = undefined;
				if(obj){
					userRole = obj.get("role");
					obj.destroy();
				}

				var query = new Parse.Query(Parse.Role);
				query.equalTo("name", record.get('username'));

				query.first()
					.then(function(roleObj){
					var promises = [];
					if(roleObj)
						promises.push(roleObj.destroy());
					if(userRole == "Main"){
						if(org)
							promises.push(org.destroy());
						if(bus)
							promises.push(bus.destroy());
						if(acc)
							promises.push(acc.destroy());
						if(curr)
							promises.push(curr.destroy());
						if(prin)
							promises.push(prin.destroy());
					}

					$q.all(promises)
						.then(function(){
						var deleting = record.id;
						var beforeDelete = $scope.records.length;
						Parse.Cloud.run("deleteUser", {identificator: deleting}, {
							success: function() {
								console.log("Cloud delete successfull");
							},
							error: function(error) {
								console.log("Cloud delete failed: " + error.message);
							}
						}).then(function() {
							$scope.updateQueryResults();
							$scope.$apply(function() {
								$scope.updateQueryResults();
							});
						});
					}, function(error){
						var deleting = record.id;
						var beforeDelete = $scope.records.length;
						Parse.Cloud.run("deleteUser", {identificator: deleting}, {
							success: function() {
								console.log("Cloud delete successfull");
							},
							error: function(error) {
								console.log("Cloud delete failed: " + error.message);
							}
						}).then(function() {
							$('.loader-screen').hide();
							$scope.updateQueryResults();
							$scope.$apply(function() {
								$scope.updateQueryResults();
							});
						});
						console.error(error);
					});
				});
			}, function(error){
				var query = new Parse.Query(Parse.Role);
				query.equalTo("name", record.get('username'));

				query.first()
					.then(function(roleObj){
					var promises = [];
					if(roleObj)
						promises.push(roleObj.destroy());

					if(org)
						promises.push(org.destroy());

					$q.all(promises)
						.then(function(){
						var deleting = record.id;
						var beforeDelete = $scope.records.length;
						Parse.Cloud.run("deleteUser", {identificator: deleting}, {
							success: function() {
								console.log("Cloud delete successfull");
							},
							error: function(error) {
								console.log("Cloud delete failed: " + error.message);
							}
						}).then(function() {
							$('.loader-screen').hide();
							$scope.updateQueryResults();
							$scope.$apply(function() {
								$scope.updateQueryResults();
							});
						});
					}, function(error){
						var deleting = record.id;
						var beforeDelete = $scope.records.length;
						Parse.Cloud.run("deleteUser", {identificator: deleting}, {
							success: function() {
								console.log("Cloud delete successfull");
							},
							error: function(error) {
								console.log("Cloud delete failed: " + error.message);
							}
						}).then(function() {
							$('.loader-screen').hide();
							$scope.updateQueryResults();
							$scope.$apply(function() {
								$scope.updateQueryResults();
							});
						});
						console.error(error);
					});
				});
			});
		}

		$scope.openModalCreate = function() {
			var modalInstance = $modal.open({
				animation: false,
				templateUrl: 'add-basic-info',
				controller: 'ModalCreateController',
				windowClass: 'window-shadow',
				backdrop: true,
				resolve: {
					newUserRecord: function() {
						console.log('resolve');
						return $scope.newUserRecord;
					},
					gatewayTypeNames: function() {
						return $scope.gatewayTypeNames;
					},
					account : function(){
						return new accountInfoFactory();
					},
					business : function(){
						return new businessInfoFactory();
					}
				}
			});

			modalInstance.result.then(function(result) {
				$('.loader-screen').show();
				console.log('modal create submitted');

				var skipApp = $scope.newUserRecord.skipApplication;
				var formInfo = {
					fullname      : $scope.newUserRecord.fullName,
					address       : $scope.newUserRecord.address,
					city          : $scope.newUserRecord.city,
					state         : $scope.newUserRecord.state,
					zipCode       : $scope.newUserRecord.zip,
					phone         : $scope.newUserRecord.phone,
					email         : $scope.newUserRecord.email,
					merchantId    : $scope.newUserRecord.merchantReferenceId,
					businessName  : $scope.newUserRecord.businessName,
					username      : $scope.newUserRecord.username,
					paymentGateway   : $scope.newUserRecord.paymentGateway,

				};

				$scope.newUserRecord.reseller = currentUser;

				$scope.newUserRecord.save(null, {
					success: function(record) {
						$scope.$apply(function() {
							$scope.records.push($scope.newUserRecord);
							$scope.newUserRecord = new userRecordFactory();
							$scope.newUserRecord.set("accountInfo", new accountInfoFactory);
							$scope.newUserRecord.set("businessInfo", new businessInfoFactory);
							$scope.newUserRecord.accountAssigned = true;
							$scope.newUserRecord.businessAssigned = true;
							$scope.newUserRecord.paymentGateway = '';
						});
						console.log("successfully created:", record);
					},
					error: function(record, error) {
						alert("Failed to create object:" + error.message);
					}
				}).then(function(user){

					var userTables = {
						//business : new businessInfoFactory(),
						business : null,
						account : null,
						principal : new principalInfoFactory(),
						signatureImage : new signatureFactory(),
						selectedOrganization : new organizationFactory(),
						currency : new currencyFactory(),
						projectUser : new projectUserFactory(),
						preferences : new preferencesFactory()
					}

					for (var table in userTables){
						if (!userTables[table]) continue;
						userTables[table].SetDummyInfo();
						if (userTables[table].SetData)
							userTables[table].SetData(formInfo);
					}

					result.business.SetData(formInfo);

					userTables.signatureImage.set("imageName","Signature_" + user.id);
					userTables.signatureImage.set("user",user);
					userTables.account = result.account;
					userTables.business = result.business;
					userTables.selectedOrganization.set("userID", user);
					userTables.currency.set('userId', user);
					userTables.projectUser.set('userID', user);
					userTables.preferences.set('userID', user);

					var promises = toArray(userTables).map(function(table){
						return table.save();
					});

					//Parse.Promise.when(promises).then(function(busObj,accObj,prObj,signObj,orgObj,currObj,projObj,prefObj){
					Parse.Promise.when(promises).then(function(result){

						var busObj = result[0];
						var accObj = result[1];
						var prObj = result[2];
						var signObj = result[3];
						var orgObj = result[4];
						var currObj = result[5];
						var projObj = result[6];
						var prefObj = result[7];

						currObj.set('organization', orgObj);
						prefObj.set('organization', orgObj);
						projObj.set('organization', orgObj);
						var p = [];
						prefObj.save();
						projObj.save();
						//p.push(currObj.save());
						//p.push(prefObj.save());
						currObj.save()
						//$q.all(p)
							.then(function(currencyObj){
							Parse.Cloud.run("UpdateUser",{user : {
								id : user.id,
								params : {},
								pointers : [
									{
										id : busObj.id,
										className : 'BusinessInfo',
										field : 'businessInfo'
									},
									{
										id : accObj.id,
										className : 'AccountInfo',
										field : 'accountInfo'
									},
									{
										id : prObj.id,
										className : 'PrincipalInfo',
										field : 'principalInfo'
									},
									{
										id : signObj.id,
										className : 'Signature',
										field : 'signatureImage'
									},
									{
										id : orgObj.id,
										className : 'Organization',
										field : 'selectedOrganization'
									},
									{
										id : orgObj.id,
										className : 'Organization',
										field : 'organizations'
									},
									{
										id : currencyObj.id,
										className : 'Currency',
										field : 'currency'
									}
								]
							}})
								.then(function(msg){
								$('.loader-screen').hide();
								console.log("Cloud update successfull");
								//$scope.updateQueryResults();
								window.location.reload();
							}, function(error){
								console.log(error);
							});
						}, function(err){
							debugger;
						});
					});
				});

			}, function() {
				console.log('modal create cancelled');
			});
		};


		/*****************************************************************************/

		$scope.openDeleteModal = function(record){
			$scope.currentRecord = record;
			$("#myModal").css("display" ,"block");
		}   

		$scope.closeDeleteModal = function(){
			$scope.currentRecord = undefined;
			$("#myModal").css("display" ,"none");
		}

		window.onclick = function(event){
			var modal = document.getElementById('myModal');
			if (event.target == modal){
				$scope.currentRecord = undefined;
				$("#myModal").css("display" ,"none");
			}
		}

		if($state.params.resellerId){
			$scope.isReseller = false;
			$('.loader-screen').show();

			var query = new Parse.Query(Parse.User);

			query.get($state.params.resellerId)
				.then(function(obj){
				$('.loader-screen').hide();
				currentUser = obj;
				$scope.updateQueryResults();
				currentUser.get("resellerInfo").fetch()
					.then(function(obj){
					$scope.costPerMerchant = obj.get("costPerMerchant");

					if(!$scope.$$phase)
						$scope.$apply();
				}, function(error){
					console.error(error.message);
					debugger;
				});
			}, function(error){
				console.error(error.message);
				debugger;
			});
		} else {
			$scope.isReseller = true;
			currentUser = Parse.User.current();
			$scope.updateQueryResults();

			Parse.User.current().get("resellerInfo").fetch()
				.then(function(obj){
				$scope.costPerMerchant = obj.get("costPerMerchant");

				if(!$scope.$$phase)
					$scope.$apply();
			}, function(error){
				console.error(error.message);
				debugger;
			});
		}
	}]);
