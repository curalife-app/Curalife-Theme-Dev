;
(function () {
  function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
  function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
  function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
  function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
  function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
  function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
  function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
  function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
  function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
  function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
  function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function _wrapNativeSuper(t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
  function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
  function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
  function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
  function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
  function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
  System.register([], function (exports, module) {
    'use strict';

    return {
      execute: function execute() {
        /*
         * Shopify Common JS - Updated for testing (v2)
         *
         */
        if (typeof window.Shopify == "undefined") {
          window.Shopify = {};
        }
        Shopify.bind = function (fn, scope) {
          return function () {
            return fn.apply(scope, arguments);
          };
        };
        Shopify.setSelectorByValue = function (selector, value) {
          for (var i = 0, count = selector.options.length; i < count; i++) {
            var option = selector.options[i];
            if (value == option.value || value == option.innerHTML) {
              selector.selectedIndex = i;
              return i;
            }
          }
        };
        Shopify.addListener = function (target, eventName, callback) {
          target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent("on" + eventName, callback);
        };
        Shopify.postLink = function (path, options) {
          options = options || {};
          var method = options["method"] || "post";
          var params = options["parameters"] || {};
          var form = document.createElement("form");
          form.setAttribute("method", method);
          form.setAttribute("action", path);
          for (var key in params) {
            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);
            form.appendChild(hiddenField);
          }
          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);
        };
        Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
          this.countryEl = document.getElementById(country_domid);
          this.provinceEl = document.getElementById(province_domid);
          this.provinceContainer = document.getElementById(options["hideElement"] || province_domid);
          Shopify.addListener(this.countryEl, "change", Shopify.bind(this.countryHandler, this));
          this.initCountry();
          this.initProvince();
        };
        Shopify.CountryProvinceSelector.prototype = {
          initCountry: function initCountry() {
            var value = this.countryEl.getAttribute("data-default");
            Shopify.setSelectorByValue(this.countryEl, value);
            this.countryHandler();
          },
          initProvince: function initProvince() {
            var value = this.provinceEl.getAttribute("data-default");
            if (value && this.provinceEl.options.length > 0) {
              Shopify.setSelectorByValue(this.provinceEl, value);
            }
          },
          countryHandler: function countryHandler(e) {
            var opt = this.countryEl.options[this.countryEl.selectedIndex];
            var raw = opt.getAttribute("data-provinces");
            var provinces = JSON.parse(raw);
            this.clearOptions(this.provinceEl);
            if (provinces && provinces.length == 0) {
              this.provinceContainer.style.display = "none";
            } else {
              for (var i = 0; i < provinces.length; i++) {
                var opt = document.createElement("option");
                opt.value = provinces[i][0];
                opt.innerHTML = provinces[i][1];
                this.provinceEl.appendChild(opt);
              }
              this.provinceContainer.style.display = "";
            }
          },
          clearOptions: function clearOptions(selector) {
            while (selector.firstChild) {
              selector.removeChild(selector.firstChild);
            }
          },
          setOptions: function setOptions(selector, values) {
            for (var i = 0, count = values.length; i < values.length; i++) {
              var opt = document.createElement("option");
              opt.value = values[i];
              opt.innerHTML = values[i];
              selector.appendChild(opt);
            }
          }
        };
        var DetailsDisclosure = /*#__PURE__*/function (_HTMLElement) {
          function DetailsDisclosure() {
            var _this;
            _classCallCheck(this, DetailsDisclosure);
            _this = _callSuper(this, DetailsDisclosure);
            _this.mainDetailsToggle = _this.querySelector('details');
            _this.content = _this.mainDetailsToggle.querySelector('summary').nextElementSibling;
            _this.mainDetailsToggle.addEventListener('focusout', _this.onFocusOut.bind(_this));
            _this.mainDetailsToggle.addEventListener('toggle', _this.onToggle.bind(_this));
            return _this;
          }
          _inherits(DetailsDisclosure, _HTMLElement);
          return _createClass(DetailsDisclosure, [{
            key: "onFocusOut",
            value: function onFocusOut() {
              var _this2 = this;
              setTimeout(function () {
                if (!_this2.contains(document.activeElement)) _this2.close();
              });
            }
          }, {
            key: "onToggle",
            value: function onToggle() {
              if (!this.animations) this.animations = this.content.getAnimations();
              if (this.mainDetailsToggle.hasAttribute('open')) {
                this.animations.forEach(function (animation) {
                  return animation.play();
                });
              } else {
                this.animations.forEach(function (animation) {
                  return animation.cancel();
                });
              }
            }
          }, {
            key: "close",
            value: function close() {
              this.mainDetailsToggle.removeAttribute('open');
              this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
            }
          }]);
        }(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
        customElements.define('details-disclosure', DetailsDisclosure);
        var HeaderMenu = /*#__PURE__*/function (_DetailsDisclosure) {
          function HeaderMenu() {
            var _this3;
            _classCallCheck(this, HeaderMenu);
            _this3 = _callSuper(this, HeaderMenu);
            _this3.header = document.querySelector('.header-wrapper');
            return _this3;
          }
          _inherits(HeaderMenu, _DetailsDisclosure);
          return _createClass(HeaderMenu, [{
            key: "onToggle",
            value: function onToggle() {
              if (!this.header) return;
              this.header.preventHide = this.mainDetailsToggle.open;
              if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
              document.documentElement.style.setProperty('--header-bottom-position-desktop', "".concat(Math.floor(this.header.getBoundingClientRect().bottom), "px"));
            }
          }]);
        }(DetailsDisclosure);
        customElements.define('header-menu', HeaderMenu);
        var DetailsModal = /*#__PURE__*/function (_HTMLElement2) {
          function DetailsModal() {
            var _this4;
            _classCallCheck(this, DetailsModal);
            _this4 = _callSuper(this, DetailsModal);
            _this4.detailsContainer = _this4.querySelector('details');
            _this4.summaryToggle = _this4.querySelector('summary');
            _this4.detailsContainer.addEventListener('keyup', function (event) {
              return event.code.toUpperCase() === 'ESCAPE' && _this4.close();
            });
            _this4.summaryToggle.addEventListener('click', _this4.onSummaryClick.bind(_this4));
            _this4.querySelector('button[type="button"]').addEventListener('click', _this4.close.bind(_this4));
            _this4.summaryToggle.setAttribute('role', 'button');
            return _this4;
          }
          _inherits(DetailsModal, _HTMLElement2);
          return _createClass(DetailsModal, [{
            key: "isOpen",
            value: function isOpen() {
              return this.detailsContainer.hasAttribute('open');
            }
          }, {
            key: "onSummaryClick",
            value: function onSummaryClick(event) {
              event.preventDefault();
              event.target.closest('details').hasAttribute('open') ? this.close() : this.open(event);
            }
          }, {
            key: "onBodyClick",
            value: function onBodyClick(event) {
              if (!this.contains(event.target) || event.target.classList.contains('modal-overlay')) this.close(false);
            }
          }, {
            key: "open",
            value: function open(event) {
              this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this);
              event.target.closest('details').setAttribute('open', true);
              document.body.addEventListener('click', this.onBodyClickEvent);
              document.body.classList.add('overflow-hidden');
              trapFocus(this.detailsContainer.querySelector('[tabindex="-1"]'), this.detailsContainer.querySelector('input:not([type="hidden"])'));
            }
          }, {
            key: "close",
            value: function close() {
              var focusToggle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
              removeTrapFocus(focusToggle ? this.summaryToggle : null);
              this.detailsContainer.removeAttribute('open');
              document.body.removeEventListener('click', this.onBodyClickEvent);
              document.body.classList.remove('overflow-hidden');
            }
          }]);
        }(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
        customElements.define('details-modal', DetailsModal);
        function hideProductModal() {
          var productModal = document.querySelectorAll('product-modal[open]');
          productModal && productModal.forEach(function (modal) {
            return modal.hide();
          });
        }
        document.addEventListener('shopify:block:select', function (event) {
          hideProductModal();
          var blockSelectedIsSlide = event.target.classList.contains('slideshow__slide');
          if (!blockSelectedIsSlide) return;
          var parentSlideshowComponent = event.target.closest('slideshow-component');
          parentSlideshowComponent.pause();
          setTimeout(function () {
            parentSlideshowComponent.slider.scrollTo({
              left: event.target.offsetLeft
            });
          }, 200);
        });
        document.addEventListener('shopify:block:deselect', function (event) {
          var blockDeselectedIsSlide = event.target.classList.contains('slideshow__slide');
          if (!blockDeselectedIsSlide) return;
          var parentSlideshowComponent = event.target.closest('slideshow-component');
          if (parentSlideshowComponent.autoplayButtonIsSetToPlay) parentSlideshowComponent.play();
        });
        document.addEventListener('shopify:section:load', function () {
          hideProductModal();
          var zoomOnHoverScript = document.querySelector('[id^=EnableZoomOnHover]');
          if (!zoomOnHoverScript) return;
          if (zoomOnHoverScript) {
            var newScriptTag = document.createElement('script');
            newScriptTag.src = zoomOnHoverScript.src;
            zoomOnHoverScript.parentNode.replaceChild(newScriptTag, zoomOnHoverScript);
          }
        });
        document.addEventListener('shopify:section:reorder', function () {
          return hideProductModal();
        });
        document.addEventListener('shopify:section:select', function () {
          return hideProductModal();
        });
        document.addEventListener('shopify:section:deselect', function () {
          return hideProductModal();
        });
        document.addEventListener('shopify:inspector:activate', function () {
          return hideProductModal();
        });
        document.addEventListener('shopify:inspector:deactivate', function () {
          return hideProductModal();
        });
        function initWebVitals() {
          if (document.readyState === "complete") {
            importAndInitVitals();
          } else {
            window.addEventListener("load", importAndInitVitals);
          }
        }
        function importAndInitVitals() {
          var script = document.createElement("script");
          script.src = "https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js";
          script.onload = function () {
            if (window.webVitals) {
              window.webVitals.getFCP(sendToAnalytics);
              window.webVitals.getLCP(sendToAnalytics);
              window.webVitals.getFID(sendToAnalytics);
              window.webVitals.getCLS(sendToAnalytics);
              window.webVitals.getTTFB(sendToAnalytics);
              window.webVitals.getINP(sendToAnalytics);
            }
          };
          document.body.appendChild(script);
        }
        function sendToAnalytics(metric) {
          var pageUrl = window.location.href;
          var pagePath = window.location.pathname;
          var pageTemplate = document.documentElement.getAttribute("data-template") || "unknown";
          var data = {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            // 'good', 'needs-improvement', or 'poor'
            delta: metric.delta,
            id: metric.id,
            page: {
              url: pageUrl,
              path: pagePath,
              template: pageTemplate
            },
            timestamp: (/* @__PURE__ */new Date()).toISOString(),
            userAgent: navigator.userAgent,
            // Include shop information if available
            shop: window.Shopify ? window.Shopify.shop : void 0
          };
          {
            console.log("[Web Vitals]", metric.name, metric.value, metric.rating);
            storeMetricLocally(data);
          }
          storeMetricLocally(data);
        }
        function storeMetricLocally(data) {
          try {
            var existingMetrics = JSON.parse(localStorage.getItem("curalife_web_vitals") || "[]");
            existingMetrics.push(data);
            var limitedMetrics = existingMetrics.slice(-100);
            localStorage.setItem("curalife_web_vitals", JSON.stringify(limitedMetrics));
          } catch (error) {
            console.error("Failed to store web vitals locally:", error);
          }
        }
        function getStoredMetrics() {
          try {
            return JSON.parse(localStorage.getItem("curalife_web_vitals") || "[]");
          } catch (_unused) {
            return [];
          }
        }
        function clearStoredMetrics() {
          localStorage.removeItem("curalife_web_vitals");
        }
        var isDashboardVisible = false;
        function initPerformanceDashboard() {
          createDashboardToggle();
          document.addEventListener("keydown", function (event) {
            if (event.altKey && event.shiftKey && event.key === "P") {
              toggleDashboard();
            }
          });
        }
        function createDashboardToggle() {
          var button = document.createElement("button");
          button.id = "performance-dashboard-toggle";
          button.innerHTML = "📊";
          button.setAttribute("aria-label", "Toggle Performance Dashboard");
          button.title = "Toggle Performance Dashboard (Alt+Shift+P)";
          Object.assign(button.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: "9999",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: "#4338ca",
            color: "white",
            border: "none",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
            fontSize: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          });
          button.addEventListener("click", toggleDashboard);
          document.body.appendChild(button);
        }
        function toggleDashboard() {
          if (isDashboardVisible) {
            var dashboard = document.getElementById("performance-dashboard");
            if (dashboard) {
              dashboard.remove();
            }
            isDashboardVisible = false;
          } else {
            createDashboard();
            isDashboardVisible = true;
          }
        }
        function createDashboard() {
          var dashboard = document.createElement("div");
          dashboard.id = "performance-dashboard";
          Object.assign(dashboard.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            bottom: "20px",
            width: "400px",
            backgroundColor: "white",
            boxShadow: "0 0 20px rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            zIndex: "9998",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            fontFamily: "system-ui, -apple-system, sans-serif"
          });
          var header = document.createElement("div");
          Object.assign(header.style, {
            padding: "15px 20px",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#4338ca",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          });
          var title = document.createElement("h2");
          title.textContent = "Performance Dashboard";
          Object.assign(title.style, {
            margin: "0",
            fontSize: "18px",
            fontWeight: "600"
          });
          var closeButton = document.createElement("button");
          closeButton.innerHTML = "&times;";
          closeButton.setAttribute("aria-label", "Close Dashboard");
          Object.assign(closeButton.style, {
            background: "none",
            border: "none",
            color: "white",
            fontSize: "24px",
            cursor: "pointer",
            padding: "0",
            lineHeight: "1"
          });
          closeButton.addEventListener("click", toggleDashboard);
          var buttonsContainer = document.createElement("div");
          Object.assign(buttonsContainer.style, {
            padding: "10px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            gap: "10px"
          });
          var refreshButton = document.createElement("button");
          refreshButton.textContent = "Refresh";
          styleButton(refreshButton);
          refreshButton.addEventListener("click", function () {
            return updateDashboardContent(dashboard);
          });
          var clearButton = document.createElement("button");
          clearButton.textContent = "Clear Data";
          styleButton(clearButton, "#ef4444");
          clearButton.addEventListener("click", function () {
            clearStoredMetrics();
            updateDashboardContent(dashboard);
          });
          var content = document.createElement("div");
          content.className = "dashboard-content";
          Object.assign(content.style, {
            padding: "20px",
            overflowY: "auto",
            flex: "1"
          });
          header.appendChild(title);
          header.appendChild(closeButton);
          buttonsContainer.appendChild(refreshButton);
          buttonsContainer.appendChild(clearButton);
          dashboard.appendChild(header);
          dashboard.appendChild(buttonsContainer);
          dashboard.appendChild(content);
          document.body.appendChild(dashboard);
          updateDashboardContent(dashboard);
        }
        function styleButton(button) {
          var bgColor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "#4338ca";
          Object.assign(button.style, {
            padding: "8px 12px",
            backgroundColor: bgColor,
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px"
          });
        }
        function updateDashboardContent(dashboard) {
          var contentContainer = dashboard.querySelector(".dashboard-content");
          if (!contentContainer) return;
          contentContainer.innerHTML = "";
          var metrics = getStoredMetrics();
          if (metrics.length === 0) {
            var emptyMessage = document.createElement("div");
            emptyMessage.textContent = "No metrics collected yet. Browse the site to collect performance data.";
            Object.assign(emptyMessage.style, {
              textAlign: "center",
              padding: "40px 20px",
              color: "#6b7280",
              fontSize: "16px"
            });
            contentContainer.appendChild(emptyMessage);
            return;
          }
          var metricsByType = {};
          var metricsByPage = {};
          metrics.forEach(function (metric) {
            if (!metricsByType[metric.name]) {
              metricsByType[metric.name] = [];
            }
            metricsByType[metric.name].push(metric);
            var pagePath = metric.page.path;
            if (!metricsByPage[pagePath]) {
              metricsByPage[pagePath] = [];
            }
            metricsByPage[pagePath].push(metric);
          });
          var summarySection = createSection("Summary");
          contentContainer.appendChild(summarySection);
          Object.keys(metricsByType).forEach(function (metricName) {
            var metricData = metricsByType[metricName];
            var values = metricData.map(function (m) {
              return m.value;
            });
            var avgValue = values.reduce(function (sum, val) {
              return sum + val;
            }, 0) / values.length;
            var color = "#10b981";
            if (metricName === "LCP" && avgValue > 2500) {
              color = avgValue > 4e3 ? "#ef4444" : "#f59e0b";
            } else if (metricName === "FID" && avgValue > 100) {
              color = avgValue > 300 ? "#ef4444" : "#f59e0b";
            } else if (metricName === "CLS" && avgValue > 0.1) {
              color = avgValue > 0.25 ? "#ef4444" : "#f59e0b";
            } else if (metricName === "FCP" && avgValue > 1800) {
              color = avgValue > 3e3 ? "#ef4444" : "#f59e0b";
            } else if (metricName === "TTFB" && avgValue > 800) {
              color = avgValue > 1800 ? "#ef4444" : "#f59e0b";
            } else if (metricName === "INP" && avgValue > 200) {
              color = avgValue > 500 ? "#ef4444" : "#f59e0b";
            }
            var formattedValue;
            if (metricName === "CLS") {
              formattedValue = avgValue.toFixed(3);
            } else {
              formattedValue = "".concat(Math.round(avgValue), "ms");
            }
            var metricRow = document.createElement("div");
            Object.assign(metricRow.style, {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #e5e7eb"
            });
            var nameElement = document.createElement("div");
            nameElement.textContent = getMetricFullName(metricName);
            Object.assign(nameElement.style, {
              fontWeight: "500"
            });
            var valueElement = document.createElement("div");
            valueElement.textContent = formattedValue;
            Object.assign(valueElement.style, {
              fontWeight: "600",
              color: color
            });
            metricRow.appendChild(nameElement);
            metricRow.appendChild(valueElement);
            summarySection.appendChild(metricRow);
          });
          var pageSection = createSection("Page Breakdown");
          contentContainer.appendChild(pageSection);
          Object.keys(metricsByPage).forEach(function (pagePath) {
            var pageMetrics = metricsByPage[pagePath];
            var pageRow = document.createElement("div");
            Object.assign(pageRow.style, {
              padding: "10px 0",
              borderBottom: "1px solid #e5e7eb"
            });
            var pathElement = document.createElement("div");
            pathElement.textContent = pagePath;
            Object.assign(pathElement.style, {
              fontWeight: "500",
              marginBottom: "5px"
            });
            var metricsGrid = document.createElement("div");
            Object.assign(metricsGrid.style, {
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "5px",
              fontSize: "13px"
            });
            var latestMetrics = {};
            pageMetrics.forEach(function (metric) {
              if (!latestMetrics[metric.name] || new Date(metric.timestamp) > new Date(latestMetrics[metric.name].timestamp)) {
                latestMetrics[metric.name] = metric;
              }
            });
            Object.values(latestMetrics).forEach(function (metric) {
              var metricTile = document.createElement("div");
              Object.assign(metricTile.style, {
                padding: "5px",
                backgroundColor: getMetricColor(metric.name, metric.value),
                color: "white",
                borderRadius: "4px",
                textAlign: "center"
              });
              var metricValue = metric.name === "CLS" ? metric.value.toFixed(3) : "".concat(Math.round(metric.value), "ms");
              metricTile.textContent = "".concat(metric.name, ": ").concat(metricValue);
              metricsGrid.appendChild(metricTile);
            });
            pageRow.appendChild(pathElement);
            pageRow.appendChild(metricsGrid);
            pageSection.appendChild(pageRow);
          });
          var trendsSection = createSection("Trends");
          var trendsMessage = document.createElement("p");
          trendsMessage.textContent = "".concat(metrics.length, " data points collected. View detailed trends by exporting data.");
          trendsSection.appendChild(trendsMessage);
          contentContainer.appendChild(trendsSection);
        }
        function createSection(title) {
          var section = document.createElement("div");
          Object.assign(section.style, {
            marginBottom: "25px"
          });
          var sectionTitle = document.createElement("h3");
          sectionTitle.textContent = title;
          Object.assign(sectionTitle.style, {
            fontSize: "16px",
            fontWeight: "600",
            marginBottom: "10px",
            paddingBottom: "5px",
            borderBottom: "2px solid #4338ca"
          });
          section.appendChild(sectionTitle);
          return section;
        }
        function getMetricFullName(shortName) {
          var names = {
            LCP: "Largest Contentful Paint",
            FID: "First Input Delay",
            CLS: "Cumulative Layout Shift",
            FCP: "First Contentful Paint",
            TTFB: "Time to First Byte",
            INP: "Interaction to Next Paint"
          };
          return names[shortName] || shortName;
        }
        function getMetricColor(name, value) {
          var color = "#10b981";
          switch (name) {
            case "LCP":
              if (value > 4e3) color = "#ef4444";else if (value > 2500) color = "#f59e0b";
              break;
            case "FID":
              if (value > 300) color = "#ef4444";else if (value > 100) color = "#f59e0b";
              break;
            case "CLS":
              if (value > 0.25) color = "#ef4444";else if (value > 0.1) color = "#f59e0b";
              break;
            case "FCP":
              if (value > 3e3) color = "#ef4444";else if (value > 1800) color = "#f59e0b";
              break;
            case "TTFB":
              if (value > 1800) color = "#ef4444";else if (value > 800) color = "#f59e0b";
              break;
            case "INP":
              if (value > 500) color = "#ef4444";else if (value > 200) color = "#f59e0b";
              break;
          }
          return color;
        }
        function initPerformanceMonitoring() {
          initWebVitals();
          initPerformanceDashboard();
        }
        function initializePerformanceMonitoring() {
          initPerformanceMonitoring();
          {
            console.log("[Performance] Monitoring initialized in development mode");
            console.log("[Performance] Press Alt+Shift+P to open the dashboard");
          }
        }
        document.addEventListener("DOMContentLoaded", function () {
          initializePerformanceMonitoring();
        });
        console.log("🌍 Global bundle loaded - Core theme functionality initialized");
      }
    };
  });
})();
