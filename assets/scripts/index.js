const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
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

  function openSidebar() {
    sidebar.classList.add('is-open');
    sidebarBackdrop.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    // Lock the page behind the menu so only the menu scrolls
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeSidebar() {
    if (!sidebar.classList.contains('is-open')) return;
    sidebar.classList.remove('is-open');
    sidebarBackdrop.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

menuBtn.addEventListener('click', openSidebar);
closeBtn.addEventListener('click', closeSidebar);
sidebarBackdrop.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSidebar();
});
// Close before the quote modal opens or a link navigates (quote.js then applies its own scroll lock)
sidebar.addEventListener('click', (e) => {
  if (e.target.closest('[data-quote-open], a[href]')) closeSidebar();
});

var searchScript = document.createElement('script');
searchScript.src = '/assets/scripts/search.js';
document.body.appendChild(searchScript);

var scrollHintScript = document.createElement('script');
scrollHintScript.src = '/assets/scripts/scroll-hint.js';
document.body.appendChild(scrollHintScript);

var tableScrollScript = document.createElement('script');
tableScrollScript.src = '/assets/scripts/table-scroll.js';
document.body.appendChild(tableScrollScript);

var quoteScript = document.createElement('script');
quoteScript.src = '/assets/scripts/quote.js';
document.body.appendChild(quoteScript);

var gaEventsScript = document.createElement('script');
gaEventsScript.src = '/assets/scripts/ga-events.js';
document.body.appendChild(gaEventsScript);

function toggleDropdown() {
  var dropdown = document.getElementById('dropdownMenu');
  var open = !dropdown.classList.toggle('hidden');
  document.getElementById('dropdownIcon').classList.toggle('rotate-180', open);
  document.getElementById('products-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
}

function submitForm(e){
  alert("Form submitted successfully");
}
