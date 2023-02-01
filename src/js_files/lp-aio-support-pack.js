(function () {

    // brandsTicker = new Swiper('.partners-wrapper #ticker-wrap', {
    //     spaceBetween: 0,
    //     centeredSlides: true,
    //     speed: 6000,
    //     autoplay: {
    //         delay: 0,
    //     },
    //     loop: true,
    //     slidesPerView:'auto',
    //     allowTouchMove: false,
    //     disableOnInteraction: true
    //   });

    // const get_utm = window.location.search.substring(1);
    // if (get_utm) {
    //     let product_link = document.querySelectorAll('.btn-cta, .floating-cta .btn-cta');
    //     window.onload = function () {
    //         for (let i = 0; i < product_link.length; i++) {
    //             product_link[i].href = product_link[i].href + "?" + get_utm
    //         }
    //     }
    // }

    // if (!$(".hero-section .brand-welcome-text .v3").length) {
    //     let typed = new Typed('.hero-section .brand-welcome-text span', {
    //         strings: ["sleep well", "eat well", "feel energetic", "stay romantic", "stay healthy"],
    //         typeSpeed: 50,
    //         backDelay: 3000,
    //         backSpeed: 30,
    //         loop: true
    //     });
    // }

    // function showvideo() {
    //     this.classList.add('show-video');
    // }

    // document.querySelector('.iframe_overlay').closest(".testimonials-video_part").addEventListener('click', showvideo)

    /*count-effect*/
    // const counters = document.querySelectorAll('.satisfaction-survey .success-list ul li .percentage p span');
    // const countingSpeed = 6000;
    // let animateCounters = true;
    /*count-effect*/

    // window.addEventListener('scroll', (e) => {
    //     // var btn = $('#wisepops-root');
    //     let last_known_scroll_position = window.scrollY;
    //     if (counters && animateCounters && window.innerHeight > document.querySelector('.satisfaction-survey .data-wrap').getBoundingClientRect().top && window.innerHeight < document.querySelector('.satisfaction-survey .data-wrap').getBoundingClientRect().top + document.querySelector('.satisfaction-survey .survey-button').getBoundingClientRect().top) {
    //         animateCounters = false;
    //         counters.forEach(counter => {
    //             const animate = () => {
    //                 const value = parseFloat(+counter.getAttribute('data-count'));
    //                 const dataLine = counter.closest('li').querySelector('.line span');
    //                 const data = +counter.innerText;

    //                 const time = value / countingSpeed;
    //                 if (data < value) {
    //                     counter.innerText = Math.ceil(data + time);
    //                     dataLine.style.width = Math.ceil(data + time) + '%';
    //                     setTimeout(animate, 0.1);
    //                 } else {
    //                     counter.innerText = value;
    //                     dataLine.style.width = value + '%';
    //                 }
    //             }
    //             animate();
    //         });
    //     }

    //     if ((document.querySelector('.real-changes').getBoundingClientRect().top < -(document.querySelector('.life-changes .survey-button .btn-cta').getBoundingClientRect().height / 2) || document.querySelector('.body-formula').getBoundingClientRect().top < -(document.querySelector('.life-changes .survey-button .btn-cta').getBoundingClientRect().height / 2)) &&
    //         window.innerHeight < document.querySelector('.satisfaction-survey .survey-button .btn-cta').getBoundingClientRect().top) {
    //         document.querySelector('.floating-cta').classList.add('show');
    //         // btn.addClass('hide');
    //     } else if (document.querySelector('.satisfaction-survey .survey-button .btn-cta').getBoundingClientRect().top < -document.querySelector('.satisfaction-survey .survey-button .btn-cta').getBoundingClientRect().height && !document.querySelector('.floating-cta').classList.contains("active")) {
    //         document.querySelector('.floating-cta').classList.add('show');
    //         // btn.addClass('hide');
    //     } else {
    //         document.querySelector('.floating-cta').classList.remove('show');
    //         // btn.removeClass('hide');
    //     }
    // });
})();