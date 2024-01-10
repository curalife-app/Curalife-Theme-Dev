const reviewsSlider = new Swiper('.real-reviews .swiper', {
    slidesPerView: 2,
    spaceBetween: 0,
    grabCursor: true,
    loop: true,
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
        disabledClass: 'disabled'
    },
    autoplay: {
        delay: 3000,
    },
    breakpoints: {
        0: {
            slidesPerView: 1,
        },
        630: {
            slidesPerView: 2,
        },
        900: {
            slidesPerView: 3,
        },
        1100: {
            slidesPerView: 4,
        },
    }
});

const ingredientsSlider = new Swiper('.ingredients-slider .swiper', {
    slidesPerView: 1,
    spaceBetween: 15,
    // grabCursor: true,
    loop: false,
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
        disabledClass: 'disabled'
    },
    pagination: {
        el: '.ingredients-bullets',
        type: 'bullets',
        clickable: true
    },
});

const doctorsSlider = new Swiper('.doctors-list .list-slider .swiper', {
    slidesPerView: 1,
    spaceBetween: 8,
    grabCursor: true,
    loop: false,
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
        disabledClass: 'disabled'
    },
    pagination: {
        el: '.slider-bullets',
        bulletClass: 'bullet',
        bulletActiveClass: 'active',
        type: 'bullets',
        clickable: true
    },
    breakpoints: {
        0: {
            slidesPerView: 1.8,
            spaceBetween: 8,
        },
        641: {
            slidesPerView: 'auto',
            spaceBetween: 17,
        }
    }
});

const seenSlider = new Swiper('.seen-on .seen-slider .swiper', {
    slidesPerView: 1,
    spaceBetween: 8,
    grabCursor: true,
    loop: false,
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
        disabledClass: 'disabled'
    },
    breakpoints: {
        0: {
            spaceBetween: 35,
            slidesPerView: 1.7,
        },
        641: {
            slidesPerView: 2,
        },
        900: {
            slidesPerView: 3,
            spaceBetween: 15,
        },
        1271: {
            slidesPerView: 4,
            spaceBetween: 30,
        },
        1391: {
            slidesPerView: 4,
            spaceBetween: 50,
        },
    }
});

const dqSlider = new Swiper('.doctors-quote .dq-slider .swiper', {
    slidesPerView: 1,
    spaceBetween: 8,
    grabCursor: true,
    loop: false,
    pagination: {
        el: '.slider-bullets',
        bulletClass: 'bullet',
        bulletActiveClass: 'active',
        type: 'bullets',
        clickable: true
    }
});
// globals
let canvas,
    ctx,
    W,
    H,
    mp = 100,
    particles = [],
    angle = 0,
    tiltAngle = 0,
    confettiActive = true,
    animationComplete = true,
    deactivationTimerHandler,
    reactivationTimerHandler,
    animationHandler;

// objects

let particleColors = {
    colorOptions: ["DodgerBlue", "OliveDrab", "Gold", "pink", "SlateBlue", "lightblue", "Violet", "PaleGreen", "SteelBlue", "SandyBrown", "Chocolate", "Crimson"],
    colorIndex: 0,
    colorIncrementer: 0,
    colorThreshold: 10,
    getColor: function () {
        if (this.colorIncrementer >= 10) {
            this.colorIncrementer = 0;
            this.colorIndex++;
            if (this.colorIndex >= this.colorOptions.length) {
                this.colorIndex = 0;
            }
        }
        this.colorIncrementer++;
        return this.colorOptions[this.colorIndex];
    }
}

function confettiParticle(color) {
    this.x = Math.random() * W; // x-coordinate
    this.y = (Math.random() * H) - H; //y-coordinate
    this.r = RandomFromTo(10, 20); //radius;
    this.d = (Math.random() * mp) + 10; //density;
    this.color = color;
    this.tilt = Math.floor(Math.random() * 10) - 10;
    this.tiltAngleIncremental = (Math.random() * 0.07) + .05;
    this.tiltAngle = 0;

    this.draw = function () {
        ctx.beginPath();
        ctx.lineWidth = this.r / 2;
        ctx.strokeStyle = this.color;
        ctx.moveTo(this.x + this.tilt + (this.r / 4), this.y);
        ctx.lineTo(this.x + this.tilt, this.y + this.tilt + (this.r / 4));
        return ctx.stroke();
    }
}

function SetGlobals() {
    canvas = document.getElementById("confetti-canvas");
    ctx = canvas.getContext("2d");
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
}

function InitializeConfetti() {
    particles = [];
    animationComplete = false;
    for (let i = 0; i < mp; i++) {
        let particleColor = particleColors.getColor();
        particles.push(new confettiParticle(particleColor));
    }
    StartConfetti();
}

function Draw() {
    ctx.clearRect(0, 0, W, H);
    let results = [];
    for (let i = 0; i < mp; i++) {
        (function (j) {
            results.push(particles[j].draw());
        })(i);
    }
    Update();

    return results;
}

function RandomFromTo(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
}

function Update() {
    let remainingFlakes = 0;
    let particle;
    angle += 0.01;
    tiltAngle += 0.1;

    for (let i = 0; i < mp; i++) {
        particle = particles[i];
        if (animationComplete) return;

        if (!confettiActive && particle.y < -15) {
            particle.y = H + 100;
            continue;
        }

        stepParticle(particle, i);

        if (particle.y <= H) {
            remainingFlakes++;
        }
        CheckForReposition(particle, i);
    }

    if (remainingFlakes === 0) {
        StopConfetti();
    }
}

function CheckForReposition(particle, index) {
    if ((particle.x > W + 20 || particle.x < -20 || particle.y > H) && confettiActive) {
        if (index % 5 > 0 || index % 2 == 0) //66.67% of the flakes
        {
            repositionParticle(particle, Math.random() * W, -10, Math.floor(Math.random() * 10) - 20);
        } else {
            if (Math.sin(angle) > 0) {
                //Enter from the left
                repositionParticle(particle, -20, Math.random() * H, Math.floor(Math.random() * 10) - 20);
            } else {
                //Enter from the right
                repositionParticle(particle, W + 20, Math.random() * H, Math.floor(Math.random() * 10) - 20);
            }
        }
    }
}

function stepParticle(particle, particleIndex) {
    particle.tiltAngle += particle.tiltAngleIncremental;
    particle.y += (Math.cos(angle + particle.d) + 3 + particle.r / 2) / 2;
    particle.x += Math.sin(angle);
    particle.tilt = (Math.sin(particle.tiltAngle - (particleIndex / 3))) * 15;
}

function repositionParticle(particle, xCoordinate, yCoordinate, tilt) {
    particle.x = xCoordinate;
    particle.y = yCoordinate;
    particle.tilt = tilt;
}

function StartConfetti() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    (function animloop() {
        if (animationComplete) return null;
        animationHandler = requestAnimFrame(animloop);
        return Draw();
    })();
}

function ClearTimers() {
    clearTimeout(reactivationTimerHandler);
    clearTimeout(animationHandler);
}

function DeactivateConfetti() {
    confettiActive = false;
    ClearTimers();
}

function StopConfetti() {
    animationComplete = true;
    if (ctx == undefined) return;
    ctx.clearRect(0, 0, W, H);
}

function RestartConfetti() {
    ClearTimers();
    StopConfetti();
    reactivationTimerHandler = setTimeout(function () {
        confettiActive = true;
        animationComplete = false;
        InitializeConfetti();
    }, 100);

}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
})();

/*window.addEventListener('load', (e) => {
    SetGlobals();
    DeactivateConfetti();
    RestartConfetti();

    InitializeConfetti();

    setTimeout(function () {
        DeactivateConfetti()
    }, 3000);
    window.onresize = function (event) {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    };
});*/


(function () {
    'use strict';

  /*  if (document.querySelector('.dark-theme')) {
        document.querySelector('html').style.backgroundColor = '#000000';
        document.querySelector('body').style.color = '#ffffff';
    }*/

    const get_utm = window.location.search.substring(1);
    let product_link = document.querySelectorAll('.product-list .card .submit-btn a, .list-wrap .card .c-wrap .bottom .b-wrap a,\
     .chose-pack .c-wrap .pack-link .active-link a, .chose-pack .c-wrap .pack-link .link a, .product-list  .single-card .main-info .btn-wrap .main-btn,\
     .product-list line-decoration .card .bottom .submit-btn a, .product-list .card .submit-btn a,\
     .more-space.v3 .product-list .single-card .main-info .btn-wrap .main-btn'); 
    let floating_btn_wrap = document.querySelector('.about-content');
    let floating_btn = document.querySelector('.about-content .floating-btn');
    let cta_floating_btn = document.querySelector('.article-content .cta-btn');
    let lumen_floating_btn = document.querySelector('.lumen-page .floating-btn');
    let ticker = document.querySelectorAll('.seen-headlines .headlines-list .ticker-wrap');
    let fixed_header = document.querySelector('.about-intro.fixed-header header');


    window.onload = function () {
        for (let i = 0; i < product_link.length; i++) {
            product_link[i].href = product_link[i].href + "&" + get_utm
        }
    }

    if (ticker.length) {
        let ticker_list = document.querySelectorAll('.seen-headlines .headlines-list .ticker-wrap ul');
        for (let i = 0; i < ticker_list.length; i++) {
            let _clone = ticker_list[i].cloneNode(true);
            ticker[i].append(_clone)
        }
    }

    window.addEventListener('scroll', (e) => {
        let last_known_scroll_position = window.scrollY;

        if (floating_btn) {
            if (floating_btn_wrap.offsetTop < last_known_scroll_position &&
                document.querySelector('.about-content .product-list').offsetTop > last_known_scroll_position) {
                floating_btn.classList.add('show');
            } else {
                floating_btn.classList.remove('show');
            }
        }

        if (lumen_floating_btn) {
            if (document.querySelector('.lumen-page .seen-on').offsetTop < last_known_scroll_position &&
                document.querySelector('.lumen-page .goods-list').offsetTop + 20 - document.querySelector('.lumen-page .goods-list').getBoundingClientRect().height > last_known_scroll_position) {
                lumen_floating_btn.classList.add('show');
            } else {
                lumen_floating_btn.classList.remove('show');
            }
        }

        if (fixed_header) {
            if (document.querySelector('.guarantee-section .extra-info').offsetTop < last_known_scroll_position) {
                fixed_header.classList.add('hide');
            } else {
                fixed_header.classList.remove('hide');
            }
        }

        if (cta_floating_btn && window.innerWidth < 641) {
            if (window.innerHeight - (cta_floating_btn.getBoundingClientRect().height + 20) > cta_floating_btn.getBoundingClientRect().top) {
                cta_floating_btn.classList.add('fixed');
                if (window.innerHeight > document.querySelector('.product-list').getBoundingClientRect().top) {
                    cta_floating_btn.classList.add('hide');
                } else {
                    cta_floating_btn.classList.remove('hide');
                }
            } else {
                cta_floating_btn.classList.remove('fixed');
            }
        }
    });

    let buyBtns = document.querySelectorAll(".buy-btn .main-btn");

    for (let i = 0; i < buyBtns.length; i++) {
        buyBtns[i].addEventListener('click', () => {
            document.querySelector('.product-list').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }

    if(document.querySelector('.lumen-intro .intro-content .intro-btn button')) {
        document.querySelector('.lumen-intro .intro-content .intro-btn button').addEventListener('click', () => {
            document.querySelector('.goods-list-face').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }
    if(lumen_floating_btn) {
        lumen_floating_btn.querySelector('button').addEventListener('click', () => {
            document.querySelector('.goods-list-face').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }

    if(document.querySelector('.mb-floating-btn .main-btn')) {
        document.querySelector('.mb-floating-btn .main-btn').addEventListener('click', () => {
            document.querySelector('.product-list').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }

    for (let i = 0; i < document.querySelectorAll('.product-list .card .img img').length; i++) {
        document.querySelectorAll('.product-list .card .img img')[i].addEventListener('click', event => {
            let _parent = event.target.closest('.card');
            _parent.querySelector('.submit-btn a').click();
        });
    }
    for (let i = 0; i < document.querySelectorAll('.product-list .single-card .img-wrap span img').length; i++) {
        document.querySelectorAll('.product-list .single-card .img-wrap span img')[i].addEventListener('click', event => {
            let _parent = event.target.closest('.single-card');
            _parent.querySelector('.main-info .btn-wrap .main-btn').click();
        });
    }
    for (let i = 0; i < document.querySelectorAll('.product-list .card .sale-label').length; i++) {
        document.querySelectorAll('.product-list .card .img img')[i].addEventListener('click', event => {
            let _parent = event.target.closest('.card');
            _parent.querySelector('.submit-btn a').click();
        });
    }

    const countdown = document.querySelector('.countdown')
    const laborCountdown = document.querySelector('.labor-countdown')

    function getTimeRemaining(endtime) {
        const total = Date.parse(endtime) - Date.parse(new Date());
        const seconds = Math.floor((total / 1000) % 60);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const days = Math.floor(total / (1000 * 60 * 60 * 24));

        return {
            total,
            days,
            hours,
            minutes,
            seconds
        };
    }

    function initializeClock(item, endtime) {
        const clock = document.querySelector(item);
        const daysSpan = clock.querySelector('.giveaway-page .countdown ul li.days p span');
        const hoursSpan = clock.querySelector('.giveaway-page .countdown ul li.hours p span');
        const minutesSpan = clock.querySelector('.giveaway-page .countdown ul li.minutes p span');
        const secondsSpan = clock.querySelector('.giveaway-page .countdown ul li.seconds p span');

        function updateClock() {
            const t = getTimeRemaining(endtime);
            daysSpan.innerHTML = t.days;
            hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
            minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
            secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);

            if (t.total <= 0) {
                clearInterval(timeInterval);
            }
        }

        updateClock();
        const timeInterval = setInterval(updateClock, 1000);
    }

    function initializeLaborClock(item, endtime) {
        const clock = document.querySelector(item);
        const daysSpan = clock.querySelector('ul li.days p span');
        const hoursSpan = clock.querySelector('ul li.hours p span');
        const minutesSpan = clock.querySelector('ul li.minutes p span');
        const secondsSpan = clock.querySelector('ul li.seconds p span');

        function updateClock() {
            const t = getTimeRemaining(endtime);
            daysSpan.innerHTML = t.days;
            hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
            minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
            secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);

            if (t.total <= 0) {
                clearInterval(timeInterval);
            }
        }

        updateClock();
        const timeInterval = setInterval(updateClock, 1000);
    }

    if (laborCountdown) {
        // year-month-dateThours:minutes:seconds:ms-GMT
        const laborDeadline = '2021-09-07T00:00:01.000-00:00';
        initializeLaborClock('.labor-countdown', laborDeadline);
    }
    if (countdown) {
        // year-month-dateThours:minutes:seconds:ms-GMT
        // const deadline = '2021-8-13 11:00:00 EST';

        const deadline = '2021-08-28T11:00:00.000-05:00';
        initializeClock('.giveaway-page .countdown', deadline);
    }

    const giveawayForm = document.querySelector('.giveaway-page .form-wrap form');

    if (giveawayForm) {
        const giveawayFullName = giveawayForm.querySelector('label input[name="full_name"]'),
            giveawayEmail = giveawayForm.querySelector('label input[name="email"]');

        fetch('https://ipinfo.io/json').then(response => {
            return response.json();
        }).then(locationJson => {
            giveawayForm.querySelector('input[name="country"]').value = locationJson.country;
            giveawayForm.querySelector('input[name="city"]').value = locationJson.city;
            giveawayForm.querySelector('input[name="state"]').value = locationJson.regionName;
        }).catch(console.error);

        function checkForm() {
            let nameCanSubmit, emailCanSubmit = false;

            if (giveawayFullName.value === '' || !isNaN(giveawayFullName.value) || !/[a-zA-Z]+\s+[a-zA-Z]+/g.test(giveawayFullName.value)) {
                nameCanSubmit = false;
                giveawayFullName.parentElement.classList.add('error')
            } else {
                nameCanSubmit = true;
                giveawayFullName.parentElement.classList.remove('error')
            }

            if (giveawayEmail.value === '' || !isNaN(giveawayEmail.value) || !/\S+@\S+\.\S+/.test(giveawayEmail.value)) {
                emailCanSubmit = false;
                giveawayEmail.parentElement.classList.add('error')
            } else {
                emailCanSubmit = true;
                giveawayEmail.parentElement.classList.remove('error')
            }

            if (nameCanSubmit && emailCanSubmit) {
                /* async function getParams() {
                     const _params = new URLSearchParams([...new FormData(giveawayForm).entries()]);
                     return await new Response(_params).text();
                 }

                 getParams().then(response => {
                     fetch(giveawayForm.action, {
                         method: 'post',
                         mode: 'no-cors',
                         headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                         body: response
                     }).then(response => {
                         /!* if (!response.ok) {
                              throw new Error('Network response was not ok.')
                          } else {*!/
                         document.querySelector('.giveaway-page .page-wrap').remove();
                         document.querySelector('.giveaway-page .thanks-wrap').classList.remove('none')
                         // }
                     }).catch(console.error);
                 });*/
                giveawayForm.querySelector('.submit-btn').classList.add('processing');
                fetch(giveawayForm.action, {
                    method: 'post',
                    mode: 'no-cors',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        'full_name': giveawayForm.full_name.value,
                        'email': giveawayForm.email.value,
                        'country': giveawayForm.country.value,
                        'state': giveawayForm.state.value,
                        'city': giveawayForm.city.value
                    })
                }).then(response => {
                    SetGlobals();
                    document.querySelector('.giveaway-page .page-wrap').remove();
                    window.scrollTo(0, 0);
                    document.querySelector('.giveaway-page .thanks-wrap').classList.remove('none');
                    InitializeConfetti();
                    setTimeout(function () {
                        DeactivateConfetti()
                    }, 3000);
                }).catch(console.error);
            }
        }

        giveawayForm.addEventListener('submit', function (e) {
            e.preventDefault();
            checkForm()
        });
    }


    const choseGoods = document.querySelector('.goods-list .chose-pack');

    if (choseGoods) {
        let choseGoodsBtn = choseGoods.querySelectorAll('.pack-list ul li .item-wrap');
        for (let i = 0; i < choseGoodsBtn.length; i++) {
            choseGoodsBtn[i].addEventListener('click', () => {
                if (!choseGoodsBtn[i].classList.contains('active')) {
                    let _pack = choseGoodsBtn[i].dataset.pack;
                    document.querySelector('.goods-list .pack-img .img.active').classList.remove('active');
                    choseGoods.querySelector('.pack-link .link.active').classList.remove('active');
                    choseGoods.querySelector('.pack-list ul li .item-wrap.active').classList.remove('active');

                    document.querySelector('.goods-list .pack-img .img[data-pack="' + _pack + '"]').classList.add('active');
                    choseGoods.querySelector('.pack-link .link[data-pack="' + _pack + '"]').classList.add('active');
                    choseGoodsBtn[i].classList.add('active');
                }
            });
        }
    }

    const accordions = document.querySelectorAll(".faq-list ul li");

    const openAccordion = (accordion) => {
        const content = accordion.querySelector(".answer");
        accordion.classList.add("active");
        // content.style.maxHeight = content.scrollHeight + "px";
    };

    const closeAccordion = (accordion) => {
        const content = accordion.querySelector(".answer");
        accordion.classList.remove("active");
        // content.style.maxHeight = null;
    };

    accordions.forEach((accordion) => {
        const intro = accordion.querySelector(".question");
        const content = accordion.querySelector(".answer");

        intro.onclick = () => {
            if (accordion.classList.contains("active")) {
                closeAccordion(accordion);
            } else {
                openAccordion(accordion);
            }
           /* if (content.style.maxHeight) {
                closeAccordion(accordion);
            } else {
                accordions.forEach((accordion) => closeAccordion(accordion));
                openAccordion(accordion);
            }*/
        };
    });


    if(document.querySelector('.fda-video .video-wrap span img')) {
        let iframe = document.querySelector('.fda-video .video-wrap span iframe');
        let player = $f(iframe);

        document.querySelector('.fda-video .video-wrap span img').addEventListener('click', () => {

            document.querySelector('.fda-video .video-wrap span').classList.add('play');
            player.api("play");

            // player.api("pause");
        });
    }

})();

//# sourceMappingURL=maps/common.js.map