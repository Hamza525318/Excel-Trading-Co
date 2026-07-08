const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const closeBtn = document.getElementById('close-btn');
// const viewMoreProductsBtn = document.getElementById('view-more-products');
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

var searchScript = document.createElement('script');
searchScript.src = '/assets/scripts/search.js';
document.body.appendChild(searchScript);
  
function toggleDropdown() {
  var dropdown = document.getElementById('dropdownMenu');
  dropdown.classList.toggle('hidden');
}

function submitForm(e){
  alert("Form submitted successfully");
}

toggleSidebar();