/**
 * Chiang Rai Temple Guide - Interactive Scripts
 */

// Lightbox functionality
function openLightbox(src, caption) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');

  lightboxImg.src = src;
  lightboxCaption.textContent = caption;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
  // If clicked inside the image itself, don't close
  if (event && event.target && event.target.id === 'lightboxImg') {
    return;
  }
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

// Close lightbox with ESC key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeLightbox();
  }
});

// Temple list filter functionality
function filterTemples(type) {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => btn.classList.remove('active'));

  // Set active button
  const currentBtn = Array.from(buttons).find(btn => {
    if (type === 'all') return btn.textContent.includes('すべて');
    if (type === 'free') return btn.textContent.includes('無料');
    if (type === 'paid') return btn.textContent.includes('有料');
    return false;
  });
  if (currentBtn) currentBtn.classList.add('active');

  const cards = document.querySelectorAll('.temple-card');
  cards.forEach(card => {
    const feeType = card.getAttribute('data-fee');
    if (type === 'all') {
      card.style.display = 'block';
    } else if (type === 'free') {
      card.style.display = (feeType === 'free') ? 'block' : 'none';
    } else if (type === 'paid') {
      card.style.display = (feeType === 'paid') ? 'block' : 'none';
    }
  });
}
