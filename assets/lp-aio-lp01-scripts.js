(function () {

const counters = document.querySelectorAll('.satisfaction-survey .success-list ul li .percentage p span');
const countingSpeed = 6000;
let animateCounters = true;

window.addEventListener('scroll', (e) => {
    let last_known_scroll_position = window.scrollY;
    if (counters && animateCounters && window.innerHeight > document.querySelector('.satisfaction-survey .data-wrap').getBoundingClientRect().top && window.innerHeight < document.querySelector('.satisfaction-survey .data-wrap').getBoundingClientRect().top) {
        animateCounters = false;
        counters.forEach(counter => {
            const animate = () => {
                const value = parseFloat(+counter.getAttribute('data-count'));
                const dataLine = counter.closest('li').querySelector('.line span');
                const data = +counter.innerText;

                const time = value / countingSpeed;
                if (data < value) {
                    counter.innerText = Math.ceil(data + time);
                    dataLine.style.width = Math.ceil(data + time) + '%';
                    setTimeout(animate, 0.1);
                } else {
                    counter.innerText = value;
                    dataLine.style.width = value + '%';
                }
            }
            animate();
        });
    }
});



function showvideo() {
    this.classList.add('show-video');
}

document.querySelector('.iframe_overlay').closest(".testimonials-video_part").addEventListener('click', showvideo)


    ingredientsThumbsSliderAllInOne = new Swiper('.product-template-all-in-one .ingredients-section .ingredients-thumbs-slider.swiper', {
        slidesPerView: 5,
        spaceBetween: 10,
        loop: false,
        breakpoints: {
            760: {
                slidesPerView: 7,
                centeredSlides: false,
            },
            1200: {
                slidesPerView: 9,
                centeredSlides: false,
            }
        }
    });
    
    ingredientsMainSliderAllInOne = new Swiper('.product-template-all-in-one .ingredients-section .ingredients-main-slider.swiper', {
        slidesPerView: 1,
        spaceBetween: 15,
        watchSlidesVisibility: false,
        loop: false,
        autoHeight: true,
        slideToClickedSlide: true,
        navigation: {
            nextEl: '.ingredients-section .swiper-button-next',
            prevEl: '.ingredients-section .swiper-button-prev',
            disabledClass: 'disabled'
        },
        thumbs: {swiper: ingredientsThumbsSliderAllInOne}
    });

});