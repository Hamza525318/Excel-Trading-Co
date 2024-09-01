$(document).ready(function() {
    $(window).on('scroll', function() {
      var section = $('#dealerships-section');
      var scrollPos = $(window).scrollTop();
      var sectionOffset = section.offset().top;

      if (scrollPos + $(window).height() > sectionOffset) {
        section.removeClass('hidden').addClass('slide-in-dealerships');
      }
    });
});