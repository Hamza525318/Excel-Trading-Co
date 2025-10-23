const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const nexBtnMobile = document.getElementById('nextBtnMobile');
const prevBtnMobile = document.getElementById('prevBtnMobile');
const testimonialContainer = document.getElementById('testimonialContainer');
const testimonials = document.querySelectorAll('.testimonial-card');
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const closeBtn = document.getElementById('close-btn');
// const viewMoreProductsBtn = document.getElementById('view-more-products');
const visibleTestimonials = 3; // Number of testimonials to show at a time
let currentIndex = 0;
const navLinks = document.querySelectorAll('.nav-link');
const mobileHeader = document.getElementById('mobile-header-btn');


function removeActiveClasses() {
    navLinks.forEach(link => {
      link.classList.remove('active-link');
    });
}

if(mobileHeader != null){
  mobileHeader.addEventListener('click',(e)=>{
    console.log("function call")
    document.getElementById('products-range-section').scrollIntoView({
      behavior: "smooth",
    })
  })
}


  // Add event listener to each link
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      removeActiveClasses();
      this.classList.add('active-link');
    });
  });

menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
  });

  function addSidebar() {
    console.log("added sidebar");
    sidebar.classList.remove('slide-out');
    sidebar.classList.remove('hidden');
    sidebar.classList.add('slide-in')
  }

  function toggleSidebar() {
    sidebar.classList.remove('slide-in');
    sidebar.classList.add('slide-out');
  }

closeBtn.addEventListener('click', toggleSidebar);
menuBtn.addEventListener('click', addSidebar);
  
let scrollAmount = 0;
const scrollStep = 450; // Adjust this value to match the width of your cards plus the margin

nextBtn.addEventListener('click', () => {
  testimonialContainer.scrollTo({
    top: 0,
    left: (scrollAmount += scrollStep),
    behavior: 'smooth',
  });
});

nexBtnMobile.addEventListener('click', () => {
  testimonialContainer.scrollTo({
    top: 0,
    left: (scrollAmount += scrollStep),
    behavior: 'smooth',
  });
});

prevBtn.addEventListener('click', () => {
  testimonialContainer.scrollTo({
    top: 0,
    left: (scrollAmount -= scrollStep),
    behavior: 'smooth',
  });
});

prevBtnMobile.addEventListener('click', () => {
  testimonialContainer.scrollTo({
    top: 0,
    left: (scrollAmount -= scrollStep),
    behavior: 'smooth',
  });
});

testimonialContainer.addEventListener('scroll', () => {
  console.log("testimonial scroll");
  // Disable the previous button if scrolled to the start
  if (testimonialContainer.scrollLeft === 0) {
    prevBtn.style.opacity = 0.5;
    prevBtn.style.pointerEvents = 'none';
  } else {
    prevBtn.style.opacity = 1;
    prevBtn.style.pointerEvents = 'auto';
  }

  // Disable the next button if scrolled to the end
  if (testimonialContainer.scrollWidth - testimonialContainer.clientWidth === testimonialContainer.scrollLeft) {
    nextBtn.style.opacity = 0.5;
    nextBtn.style.pointerEvents = 'none';
  } else {
    nextBtn.style.opacity = 1;
    nextBtn.style.pointerEvents = 'auto';
  }
});

function toggleDropdown() {
  var dropdown = document.getElementById('dropdownMenu');
  dropdown.classList.toggle('hidden');
}

function submitForm(e){
  alert("Form submitted successfully");
}

// Initially check button state
testimonialContainer.dispatchEvent(new Event('scroll'));
console.log("javascript executed");

toggleSidebar();