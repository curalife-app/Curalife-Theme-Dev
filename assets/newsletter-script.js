jQuery(document).ready(function($) {
  $("#signupForm").submit(function(event) {
    event.preventDefault();

    function signupSuccess() {
      $("#signupForm").hide();
      $("#signupMessage").show();
    }

    function signupError(message) {
      $("#signupForm input[type=submit]").removeAttr('disabled');
      $("#signupError").html(message);
      $("#signupError").show();
    }

    $("#signupError").hide();
    $("#signupForm input[type=submit]").attr('disabled', 'disabled');

    // REPLACE ME WITH AJAX CALL
    setTimeout(signupSuccess, 1000);
  });
  
  $("#signupForm input[type='email']").on("input" ,function(e){
		e.preventDefault();
		if ($(this).val().length != 0) {
			$('.error-msg').slideDown(250);
		} else{
			$('.error-msg').slideUp(250);
		}
	});
});
