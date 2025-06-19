// DOM Elements
const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');
const promptInput = document.getElementById('prompt-input');
const resultContainer = document.getElementById('result-container');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultImageContainer = document.getElementById('result-image-container');
const resultImage = document.getElementById('result-image');
const loadingIndicator = document.getElementById('loading-indicator');
const downloadBtn = document.getElementById('download-btn');
const shareBtn = document.getElementById('share-btn');
const galleryGrid = document.getElementById('gallery-grid');
const themeToggle = document.querySelector('.theme-toggle');

// Style and quality selectors
const styleSelect = document.getElementById('style-select');
const qualitySelect = document.getElementById('quality-select');
const ratioSelect = document.getElementById('ratio-select');

// Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    
    // Update icon
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-theme')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
    
    // Save preference to localStorage
    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
});

// Load saved theme preference
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        const icon = themeToggle.querySelector('i');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
    
    // Load gallery images
    loadGalleryImages();
});

// Generate Image
generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        showNotification('Please enter a description', 'error');
        return;
    }
    
    // Show loading state
    resultPlaceholder.style.display = 'none';
    resultImageContainer.style.display = 'none';
    loadingIndicator.style.display = 'flex';
    
    // Enhance prompt with selected style
    const style = styleSelect.value;
    const quality = qualitySelect.value;
    const ratio = ratioSelect.value;
    
    let enhancedPrompt = prompt;
    
    // Add style modifier to prompt
    if (style !== 'realistic') {
        const styleModifiers = {
            'artistic': 'in an artistic painting style',
            'cartoon': 'in a cartoon style',
            'fantasy': 'in a fantasy art style',
            'sci-fi': 'in a sci-fi futuristic style'
        };
        enhancedPrompt += `, ${styleModifiers[style]}`;
    }
    
    // Add quality modifier
    if (quality !== 'standard') {
        const qualityModifiers = {
            'high': ', high quality, detailed',
            'premium': ', ultra high quality, extremely detailed, 8k resolution'
        };
        enhancedPrompt += qualityModifiers[quality];
    }
    
    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: enhancedPrompt })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Display the generated image
            resultImage.src = data.image_url;
            resultImage.alt = prompt;
            
            // Show image container
            loadingIndicator.style.display = 'none';
            resultImageContainer.style.display = 'flex';
            
            // Set up download button
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = data.image_url;
                link.download = `ai-image-${Date.now()}.png`;
                link.click();
            };
            
            // Set up share button
            shareBtn.onclick = () => {
                if (navigator.share) {
                    navigator.share({
                        title: 'My AI Generated Image',
                        text: `Check out this AI image I created with the prompt: "${prompt}"`,
                        url: window.location.href
                    });
                } else {
                    // Fallback - copy URL to clipboard
                    navigator.clipboard.writeText(window.location.href);
                    showNotification('Link copied to clipboard', 'success');
                }
            };
            
            // Refresh gallery
            loadGalleryImages();
            
            showNotification('Image generated successfully!', 'success');
        } else {
            throw new Error(data.error || 'Failed to generate image');
        }
    } catch (error) {
        console.error('Error generating image:', error);
        loadingIndicator.style.display = 'none';
        resultPlaceholder.style.display = 'flex';
        showNotification(error.message, 'error');
    }
});

// Clear prompt
clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    promptInput.focus();
});

// Load gallery images
async function loadGalleryImages() {
    try {
        const response = await fetch('/history');
        const images = await response.json();
        
        if (images.length === 0) {
            galleryGrid.innerHTML = '<p class="no-images">No images generated yet. Create your first image!</p>';
            return;
        }
        
        galleryGrid.innerHTML = '';
        
        images.forEach(image => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            galleryItem.innerHTML = `
                <img src="${image.url}" alt="Generated image" class="gallery-image">
                <div class="gallery-info">
                    <p>${image.created}</p>
                </div>
            `;
            
            galleryItem.addEventListener('click', () => {
                resultImage.src = image.url;
                resultPlaceholder.style.display = 'none';
                loadingIndicator.style.display = 'none';
                resultImageContainer.style.display = 'flex';
                
                // Scroll to result container
                resultContainer.scrollIntoView({ behavior: 'smooth' });
            });
            
            galleryGrid.appendChild(galleryItem);
        });
    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryGrid.innerHTML = '<p class="error-message">Failed to load gallery images</p>';
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getIconForType(type)}"></i>
            <p>${message}</p>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Add active class after a small delay for animation
    setTimeout(() => {
        notification.classList.add('active');
    }, 10);
    
    // Auto remove after 5 seconds
    const timeout = setTimeout(() => {
        removeNotification(notification);
    }, 5000);
    
    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeout);
        removeNotification(notification);
    });
}

function removeNotification(notification) {
    notification.classList.remove('active');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
        notification.remove();
    }, 300);
}

function getIconForType(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: var(--card-bg);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-lg);
        padding: 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 350px;
        transform: translateX(400px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        z-index: 1000;
    }
    
    .notification.active {
        transform: translateX(0);
        opacity: 1;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification i {
        font-size: 1.25rem;
    }
    
    .notification.success i {
        color: var(--success-color);
    }
    
    .notification.error i {
        color: var(--error-color);
    }
    
    .notification.warning i {
        color: var(--warning-color);
    }
    
    .notification.info i {
        color: var(--primary-color);
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        color: var(--text-light);
        margin-left: 0.5rem;
    }
`;

document.head.appendChild(notificationStyles);

// Add animation to elements when they come into view
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.step, .gallery-item, .hero-content, .hero-image');
    
    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementPosition < windowHeight - 100) {
            element.classList.add('animate');
        }
    });
};

// Add animation styles
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    .step, .gallery-item, .hero-content, .hero-image {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .step.animate, .gallery-item.animate, .hero-content.animate, .hero-image.animate {
        opacity: 1;
        transform: translateY(0);
    }
    
    .hero-content {
        transition-delay: 0.2s;
    }
    
    .hero-image {
        transition-delay: 0.4s;
    }
    
    .step:nth-child(1) {
        transition-delay: 0.1s;
    }
    
    .step:nth-child(2) {
        transition-delay: 0.2s;
    }
    
    .step:nth-child(3) {
        transition-delay: 0.3s;
    }
    
    .step:nth-child(4) {
        transition-delay: 0.4s;
    }
    
    .gallery-item {
        transition-delay: calc(var(--index) * 0.1s);
    }
`;

document.head.appendChild(animationStyles);

// Set animation delay for gallery items
const setGalleryAnimationDelays = () => {
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach((item, index) => {
        item.style.setProperty('--index', index);
    });
};

// Run animations on load and scroll
window.addEventListener('load', () => {
    animateOnScroll();
    setGalleryAnimationDelays();
});

window.addEventListener('scroll', animateOnScroll);