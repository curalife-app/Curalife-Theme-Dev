;
(function () {
  function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
  function _superPropGet(t, o, e, r) { var p = _get(_getPrototypeOf(1 & r ? t.prototype : t), o, e); return 2 & r && "function" == typeof p ? function (t) { return p.apply(e, t); } : p; }
  function _get() { return _get = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function (e, t, r) { var p = _superPropBase(e, t); if (p) { var n = Object.getOwnPropertyDescriptor(p, t); return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value; } }, _get.apply(null, arguments); }
  function _superPropBase(t, o) { for (; !{}.hasOwnProperty.call(t, o) && null !== (t = _getPrototypeOf(t));); return t; }
  function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
  function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
  function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
  function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
  function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
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
        if (!customElements.get("product-form")) {
          customElements.define("product-form", /*#__PURE__*/function (_HTMLElement) {
            function ProductForm() {
              var _this;
              _classCallCheck(this, ProductForm);
              _this = _callSuper(this, ProductForm);
              _this.form = _this.querySelector("form");
              _this.form.querySelector("[name=id]").disabled = false;
              _this.form.addEventListener("submit", _this.onSubmitHandler.bind(_this));
              _this.cart = document.querySelector("cart-notification") || document.querySelector("cart-drawer");
              _this.submitButton = _this.querySelector('[type="submit"]');
              if (document.querySelector("cart-drawer")) _this.submitButton.setAttribute("aria-haspopup", "dialog");
              _this.hideErrors = _this.dataset.hideErrors === "true";
              return _this;
            }
            _inherits(ProductForm, _HTMLElement);
            return _createClass(ProductForm, [{
              key: "onSubmitHandler",
              value: function onSubmitHandler(evt) {
                var _this2 = this;
                evt.preventDefault();
                if (this.submitButton.getAttribute("aria-disabled") === "true") return;
                this.handleErrorMessage();
                this.submitButton.setAttribute("aria-disabled", true);
                this.submitButton.classList.add("loading");
                this.querySelector(".submit-title").classList.add("hidden");
                this.querySelector(".loading-overlay__spinner").classList.remove("hidden");
                var config = fetchConfig("javascript");
                config.headers["X-Requested-With"] = "XMLHttpRequest";
                delete config.headers["Content-Type"];
                var formData = new FormData(this.form);
                if (this.cart) {
                  if (typeof this.cart.getSectionsToRender === "function") {
                    formData.append("sections", this.cart.getSectionsToRender().map(function (section) {
                      return section.id;
                    }));
                  } else {
                    formData.append("sections", "");
                  }
                  formData.append("sections_url", window.location.pathname);
                  if (typeof this.cart.setActiveElement === "function") {
                    this.cart.setActiveElement(document.activeElement);
                  }
                }
                config.body = formData;
                fetch("".concat(routes.cart_add_url), config).then(function (response) {
                  return response.json();
                }).then(function (response) {
                  if (response.status) {
                    if (typeof publish$1 === "function") {
                      publish$1(PUB_SUB_EVENTS$1.cartError, {
                        source: "product-form",
                        productVariantId: formData.get("id"),
                        errors: response.errors || response.description,
                        message: response.message
                      });
                    }
                    _this2.handleErrorMessage(response.description);
                    var soldOutMessage = _this2.submitButton.querySelector(".sold-out-message");
                    if (!soldOutMessage) return;
                    _this2.submitButton.setAttribute("aria-disabled", true);
                    _this2.submitButton.querySelector("span").classList.add("hidden");
                    soldOutMessage.classList.remove("hidden");
                    _this2.error = true;
                    return;
                  } else if (!_this2.cart) {
                    window.location = window.routes.cart_url;
                    return;
                  }
                  if (!_this2.error && typeof publish$1 === "function") publish$1(PUB_SUB_EVENTS$1.cartUpdate, {
                    source: "product-form",
                    productVariantId: formData.get("id"),
                    cartData: response
                  });
                  _this2.error = false;
                  var quickAddModal = _this2.closest("quick-add-modal");
                  if (quickAddModal) {
                    document.body.addEventListener("modalClosed", function () {
                      setTimeout(function () {
                        if (typeof _this2.cart.renderContents === "function") {
                          _this2.cart.renderContents(response);
                        }
                      });
                    }, {
                      once: true
                    });
                    quickAddModal.hide(true);
                  } else {
                    if (typeof _this2.cart.renderContents === "function") {
                      _this2.cart.renderContents(response);
                    }
                  }
                }).catch(function (e) {
                  console.error(e);
                }).finally(function () {
                  _this2.submitButton.classList.remove("loading");
                  if (_this2.cart && _this2.cart.classList.contains("is-empty")) _this2.cart.classList.remove("is-empty");
                  if (!_this2.error) _this2.submitButton.removeAttribute("aria-disabled");
                  _this2.querySelector(".submit-title").classList.remove("hidden");
                  _this2.querySelector(".loading-overlay__spinner").classList.add("hidden");
                  var quantityElement = _this2.form.querySelector("[name=quantity]");
                  if (quantityElement) quantityElement.value = 1;
                });
              }
            }, {
              key: "handleErrorMessage",
              value: function handleErrorMessage() {
                var errorMessage = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
                if (this.hideErrors) return;
                this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector(".product-form__error-message-wrapper");
                if (!this.errorMessageWrapper) return;
                this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector(".product-form__error-message");
                this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);
                if (errorMessage) {
                  this.errorMessage.textContent = errorMessage;
                }
              }
            }]);
          }(/*#__PURE__*/_wrapNativeSuper(HTMLElement)));
        }
        var PUB_SUB_EVENTS$1 = {
          cartUpdate: "cart-update",
          quantityUpdate: "quantity-update"
        };
        var subscribers = {};
        function subscribe$1(eventName, callback) {
          if (subscribers[eventName] === undefined) {
            subscribers[eventName] = [];
          }
          subscribers[eventName] = [].concat(_toConsumableArray(subscribers[eventName]), [callback]);
          return function unsubscribe() {
            subscribers[eventName] = subscribers[eventName].filter(function (cb) {
              return cb !== callback;
            });
          };
        }
        function publish$1(eventName, data) {
          if (subscribers[eventName]) {
            subscribers[eventName].forEach(function (callback) {
              callback(data);
            });
          }
        }
        var QuantityInput = /*#__PURE__*/function (_HTMLElement2) {
          function QuantityInput() {
            var _this3;
            _classCallCheck(this, QuantityInput);
            _this3 = _callSuper(this, QuantityInput);
            _defineProperty(_this3, "quantityUpdateUnsubscriber", undefined);
            _this3.input = _this3.querySelector("input");
            _this3.changeEvent = new Event("change", {
              bubbles: true
            });
            _this3.input.addEventListener("change", _this3.onInputChange.bind(_this3));
            _this3.querySelectorAll("button").forEach(function (button) {
              return button.addEventListener("click", _this3.onButtonClick.bind(_this3));
            });
            return _this3;
          }
          _inherits(QuantityInput, _HTMLElement2);
          return _createClass(QuantityInput, [{
            key: "connectedCallback",
            value: function connectedCallback() {
              this.validateQtyRules();
              this.quantityUpdateUnsubscriber = subscribe$1(PUB_SUB_EVENTS$1.quantityUpdate, this.validateQtyRules.bind(this));
            }
          }, {
            key: "disconnectedCallback",
            value: function disconnectedCallback() {
              if (this.quantityUpdateUnsubscriber) {
                this.quantityUpdateUnsubscriber();
              }
            }
          }, {
            key: "onInputChange",
            value: function onInputChange(event) {
              this.validateQtyRules();
            }
          }, {
            key: "onButtonClick",
            value: function onButtonClick(event) {
              event.preventDefault();
              var previousValue = this.input.value;
              event.target.name === "plus" ? this.input.stepUp() : this.input.stepDown();
              if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
            }
          }, {
            key: "validateQtyRules",
            value: function validateQtyRules() {
              var value = parseInt(this.input.value);
              if (this.input.min) {
                var min = parseInt(this.input.min);
                var buttonMinus = this.querySelector(".quantity__button[name='minus']");
                buttonMinus.classList.toggle("disabled", value <= min);
              }
              if (this.input.max) {
                var max = parseInt(this.input.max);
                var buttonPlus = this.querySelector(".quantity__button[name='plus']");
                buttonPlus.classList.toggle("disabled", value >= max);
              }
            }
          }]);
        }(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
        customElements.define("quantity-input", QuantityInput);
        function fetchConfig() {
          var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "json";
          return {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/".concat(type)
            }
          };
        }
        if (!customElements.get('product-info')) {
          customElements.define('product-info', /*#__PURE__*/function (_HTMLElement3) {
            function ProductInfo() {
              var _this4;
              _classCallCheck(this, ProductInfo);
              _this4 = _callSuper(this, ProductInfo);
              _defineProperty(_this4, "cartUpdateUnsubscriber", undefined);
              _defineProperty(_this4, "variantChangeUnsubscriber", undefined);
              _this4.input = _this4.querySelector('.quantity__input');
              _this4.currentVariant = _this4.querySelector('.product-variant-id');
              _this4.variantSelects = _this4.querySelector('variant-radios');
              _this4.submitButton = _this4.querySelector('[type="submit"]');
              return _this4;
            }
            _inherits(ProductInfo, _HTMLElement3);
            return _createClass(ProductInfo, [{
              key: "connectedCallback",
              value: function connectedCallback() {
                var _this5 = this;
                if (!this.input) return;
                this.quantityForm = this.querySelector('.product-form__quantity');
                if (!this.quantityForm) return;
                this.setQuantityBoundries();
                if (!this.dataset.originalSection) {
                  this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.fetchQuantityRules.bind(this));
                }
                this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, function (event) {
                  var sectionId = _this5.dataset.originalSection ? _this5.dataset.originalSection : _this5.dataset.section;
                  if (event.data.sectionId !== sectionId) return;
                  _this5.updateQuantityRules(event.data.sectionId, event.data.html);
                  _this5.setQuantityBoundries();
                });
              }
            }, {
              key: "disconnectedCallback",
              value: function disconnectedCallback() {
                if (this.cartUpdateUnsubscriber) {
                  this.cartUpdateUnsubscriber();
                }
                if (this.variantChangeUnsubscriber) {
                  this.variantChangeUnsubscriber();
                }
              }
            }, {
              key: "setQuantityBoundries",
              value: function setQuantityBoundries() {
                var data = {
                  cartQuantity: this.input.dataset.cartQuantity ? parseInt(this.input.dataset.cartQuantity) : 0,
                  min: this.input.dataset.min ? parseInt(this.input.dataset.min) : 1,
                  max: this.input.dataset.max ? parseInt(this.input.dataset.max) : null,
                  step: this.input.step ? parseInt(this.input.step) : 1
                };
                var min = data.min;
                var max = data.max === null ? data.max : data.max - data.cartQuantity;
                if (max !== null) min = Math.min(min, max);
                if (data.cartQuantity >= data.min) min = Math.min(min, data.step);
                this.input.min = min;
                this.input.max = max;
                this.input.value = min;
                publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
              }
            }, {
              key: "fetchQuantityRules",
              value: function fetchQuantityRules() {
                var _this6 = this;
                if (!this.currentVariant || !this.currentVariant.value) return;
                this.querySelector('.quantity__rules-cart .loading-overlay').classList.remove('hidden');
                fetch("".concat(this.dataset.url, "?variant=").concat(this.currentVariant.value, "&section_id=").concat(this.dataset.section)).then(function (response) {
                  return response.text();
                }).then(function (responseText) {
                  var html = new DOMParser().parseFromString(responseText, 'text/html');
                  _this6.updateQuantityRules(_this6.dataset.section, html);
                  _this6.setQuantityBoundries();
                }).catch(function (e) {
                  console.error(e);
                }).finally(function () {
                  _this6.querySelector('.quantity__rules-cart .loading-overlay').classList.add('hidden');
                });
              }
            }, {
              key: "updateQuantityRules",
              value: function updateQuantityRules(sectionId, html) {
                var quantityFormUpdated = html.getElementById("Quantity-Form-".concat(sectionId));
                var selectors = ['.quantity__input', '.quantity__rules', '.quantity__label'];
                for (var _i = 0, _selectors = selectors; _i < _selectors.length; _i++) {
                  var selector = _selectors[_i];
                  var current = this.quantityForm.querySelector(selector);
                  var updated = quantityFormUpdated.querySelector(selector);
                  if (!current || !updated) continue;
                  if (selector === '.quantity__input') {
                    var attributes = ['data-cart-quantity', 'data-min', 'data-max', 'step'];
                    for (var _i2 = 0, _attributes = attributes; _i2 < _attributes.length; _i2++) {
                      var attribute = _attributes[_i2];
                      var valueUpdated = updated.getAttribute(attribute);
                      if (valueUpdated !== null) current.setAttribute(attribute, valueUpdated);
                    }
                  } else {
                    current.innerHTML = updated.innerHTML;
                  }
                }
              }
            }]);
          }(/*#__PURE__*/_wrapNativeSuper(HTMLElement)));
        }
        if (!customElements.get('product-modal')) {
          customElements.define('product-modal', /*#__PURE__*/function (_ModalDialog) {
            function ProductModal() {
              _classCallCheck(this, ProductModal);
              return _callSuper(this, ProductModal);
            }
            _inherits(ProductModal, _ModalDialog);
            return _createClass(ProductModal, [{
              key: "hide",
              value: function hide() {
                _superPropGet(ProductModal, "hide", this, 3)([]);
              }
            }, {
              key: "show",
              value: function show(opener) {
                _superPropGet(ProductModal, "show", this, 3)([opener]);
                this.showActiveMedia();
              }
            }, {
              key: "showActiveMedia",
              value: function showActiveMedia() {
                this.querySelectorAll("[data-media-id]:not([data-media-id=\"".concat(this.openedBy.getAttribute("data-media-id"), "\"])")).forEach(function (element) {
                  element.classList.remove('active');
                });
                var activeMedia = this.querySelector("[data-media-id=\"".concat(this.openedBy.getAttribute("data-media-id"), "\"]"));
                var activeMediaTemplate = activeMedia.querySelector('template');
                var activeMediaContent = activeMediaTemplate ? activeMediaTemplate.content : null;
                activeMedia.classList.add('active');
                activeMedia.scrollIntoView();
                var container = this.querySelector('[role="document"]');
                container.scrollLeft = (activeMedia.width - container.clientWidth) / 2;
                if (activeMedia.nodeName == 'DEFERRED-MEDIA' && activeMediaContent && activeMediaContent.querySelector('.js-youtube')) activeMedia.loadContent();
              }
            }]);
          }(ModalDialog));
        }
        if (!customElements.get('product-model')) {
          customElements.define('product-model', /*#__PURE__*/function (_DeferredMedia) {
            function ProductModel() {
              _classCallCheck(this, ProductModel);
              return _callSuper(this, ProductModel);
            }
            _inherits(ProductModel, _DeferredMedia);
            return _createClass(ProductModel, [{
              key: "loadContent",
              value: function loadContent() {
                _superPropGet(ProductModel, "loadContent", this, 3)([]);
                Shopify.loadFeatures([{
                  name: 'model-viewer-ui',
                  version: '1.0',
                  onLoad: this.setupModelViewerUI.bind(this)
                }]);
              }
            }, {
              key: "setupModelViewerUI",
              value: function setupModelViewerUI(errors) {
                if (errors) return;
                this.modelViewerUI = new Shopify.ModelViewerUI(this.querySelector('model-viewer'));
              }
            }]);
          }(DeferredMedia));
        }
        window.ProductModel = {
          loadShopifyXR: function loadShopifyXR() {
            Shopify.loadFeatures([{
              name: 'shopify-xr',
              version: '1.0',
              onLoad: this.setupShopifyXR.bind(this)
            }]);
          },
          setupShopifyXR: function setupShopifyXR(errors) {
            var _this7 = this;
            if (errors) return;
            if (!window.ShopifyXR) {
              document.addEventListener('shopify_xr_initialized', function () {
                return _this7.setupShopifyXR();
              });
              return;
            }
            document.querySelectorAll('[id^="ProductJSON-"]').forEach(function (modelJSON) {
              window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
              modelJSON.remove();
            });
            window.ShopifyXR.setupXRElements();
          }
        };
        window.addEventListener('DOMContentLoaded', function () {
          if (window.ProductModel) window.ProductModel.loadShopifyXR();
        });
        if (!customElements.get('media-gallery')) {
          customElements.define('media-gallery', /*#__PURE__*/function (_HTMLElement4) {
            function MediaGallery() {
              var _this8;
              _classCallCheck(this, MediaGallery);
              _this8 = _callSuper(this, MediaGallery);
              _this8.elements = {
                liveRegion: _this8.querySelector('[id^="GalleryStatus"]'),
                viewer: _this8.querySelector('[id^="GalleryViewer"]'),
                thumbnails: _this8.querySelector('[id^="GalleryThumbnails"]')
              };
              _this8.mql = window.matchMedia('(min-width: 750px)');
              if (!_this8.elements.thumbnails) return _possibleConstructorReturn(_this8);
              _this8.elements.viewer.addEventListener('slideChanged', debounce(_this8.onSlideChanged.bind(_this8), 500));
              _this8.elements.thumbnails.querySelectorAll('[data-target]').forEach(function (mediaToSwitch) {
                mediaToSwitch.querySelector('button').addEventListener('click', _this8.setActiveMedia.bind(_this8, mediaToSwitch.dataset.target, false));
              });
              if (_this8.dataset.desktopLayout.includes('thumbnail') && _this8.mql.matches) _this8.removeListSemantic();
              return _this8;
            }
            _inherits(MediaGallery, _HTMLElement4);
            return _createClass(MediaGallery, [{
              key: "onSlideChanged",
              value: function onSlideChanged(event) {
                var thumbnail = this.elements.thumbnails.querySelector("[data-target=\"".concat(event.detail.currentElement.dataset.mediaId, "\"]"));
                this.setActiveThumbnail(thumbnail);
              }
            }, {
              key: "setActiveMedia",
              value: function setActiveMedia(mediaId, prepend) {
                var _this9 = this;
                var activeMedia = this.elements.viewer.querySelector("[data-media-id=\"".concat(mediaId, "\"]"));
                this.elements.viewer.querySelectorAll('[data-media-id]').forEach(function (element) {
                  element.classList.remove('is-active');
                });
                activeMedia.classList.add('is-active');
                if (prepend) {
                  activeMedia.parentElement.prepend(activeMedia);
                  if (this.elements.thumbnails) {
                    var _activeThumbnail = this.elements.thumbnails.querySelector("[data-target=\"".concat(mediaId, "\"]"));
                    _activeThumbnail.parentElement.prepend(_activeThumbnail);
                  }
                  if (this.elements.viewer.slider) this.elements.viewer.resetPages();
                }
                this.preventStickyHeader();
                window.setTimeout(function () {
                  if (_this9.elements.thumbnails) {
                    activeMedia.parentElement.scrollTo({
                      left: activeMedia.offsetLeft
                    });
                  }
                  if (!_this9.elements.thumbnails || _this9.dataset.desktopLayout === 'stacked') {
                    activeMedia.scrollIntoView({
                      behavior: 'smooth'
                    });
                  }
                });
                this.playActiveMedia(activeMedia);
                if (!this.elements.thumbnails) return;
                var activeThumbnail = this.elements.thumbnails.querySelector("[data-target=\"".concat(mediaId, "\"]"));
                this.setActiveThumbnail(activeThumbnail);
                this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
              }
            }, {
              key: "setActiveThumbnail",
              value: function setActiveThumbnail(thumbnail) {
                if (!this.elements.thumbnails || !thumbnail) return;
                this.elements.thumbnails.querySelectorAll('button').forEach(function (element) {
                  return element.removeAttribute('aria-current');
                });
                thumbnail.querySelector('button').setAttribute('aria-current', true);
                if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;
                this.elements.thumbnails.slider.scrollTo({
                  left: thumbnail.offsetLeft
                });
              }
            }, {
              key: "announceLiveRegion",
              value: function announceLiveRegion(activeItem, position) {
                var _this0 = this;
                var image = activeItem.querySelector('.product__modal-opener--image img');
                if (!image) return;
                image.onload = function () {
                  _this0.elements.liveRegion.setAttribute('aria-hidden', false);
                  _this0.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
                  setTimeout(function () {
                    _this0.elements.liveRegion.setAttribute('aria-hidden', true);
                  }, 2000);
                };
                image.src = image.src;
              }
            }, {
              key: "playActiveMedia",
              value: function playActiveMedia(activeItem) {
                window.pauseAllMedia();
                var deferredMedia = activeItem.querySelector('.deferred-media');
                if (deferredMedia) deferredMedia.loadContent(false);
              }
            }, {
              key: "preventStickyHeader",
              value: function preventStickyHeader() {
                this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
                if (!this.stickyHeader) return;
                this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
              }
            }, {
              key: "removeListSemantic",
              value: function removeListSemantic() {
                if (!this.elements.viewer.slider) return;
                this.elements.viewer.slider.setAttribute('role', 'presentation');
                this.elements.viewer.sliderItems.forEach(function (slide) {
                  return slide.setAttribute('role', 'presentation');
                });
              }
            }]);
          }(/*#__PURE__*/_wrapNativeSuper(HTMLElement)));
        }

        // create a container and set the full-size image as its background
        function createOverlay(image) {
          overlay = document.createElement('div');
          overlay.setAttribute('class', 'image-magnify-full-size');
          overlay.setAttribute('aria-hidden', 'true');
          overlay.style.backgroundImage = "url('".concat(image.src, "')");
          image.parentElement.insertBefore(overlay, image);
          return overlay;
        }
        function moveWithHover(image, event, zoomRatio) {
          // calculate mouse position
          var ratio = image.height / image.width;
          var container = event.target.getBoundingClientRect();
          var xPosition = event.clientX - container.left;
          var yPosition = event.clientY - container.top;
          var xPercent = "".concat(xPosition / (overlay.clientWidth / 100), "%");
          var yPercent = "".concat(yPosition / (overlay.clientWidth * ratio / 100), "%");

          // determine what to show in the frame
          overlay.style.backgroundPosition = "".concat(xPercent, " ").concat(yPercent);
          overlay.style.backgroundSize = "".concat(image.width * zoomRatio, "px");
        }
        function magnify(image, zoomRatio) {
          var overlay = createOverlay(image);
          overlay.onclick = function () {
            return overlay.remove();
          };
          overlay.onmousemove = function (event) {
            return moveWithHover(image, event, zoomRatio);
          };
          overlay.onmouseleave = function () {
            return overlay.remove();
          };
        }
        function enableZoomOnHover(zoomRatio) {
          var images = document.querySelectorAll('.image-magnify-hover');
          images.forEach(function (image) {
            image.onclick = function (event) {
              magnify(image, zoomRatio);
              moveWithHover(image, event, zoomRatio);
            };
          });
        }
        enableZoomOnHover(2);
        if (!customElements.get('quick-add-modal')) {
          customElements.define('quick-add-modal', /*#__PURE__*/function (_ModalDialog2) {
            function QuickAddModal() {
              var _this1;
              _classCallCheck(this, QuickAddModal);
              _this1 = _callSuper(this, QuickAddModal);
              _this1.modalContent = _this1.querySelector('[id^="QuickAddInfo-"]');
              return _this1;
            }
            _inherits(QuickAddModal, _ModalDialog2);
            return _createClass(QuickAddModal, [{
              key: "hide",
              value: function hide() {
                var preventFocus = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
                var cartNotification = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
                if (cartNotification) cartNotification.setActiveElement(this.openedBy);
                this.modalContent.innerHTML = '';
                if (preventFocus) this.openedBy = null;
                _superPropGet(QuickAddModal, "hide", this, 3)([]);
              }
            }, {
              key: "show",
              value: function show(opener) {
                var _this10 = this;
                opener.setAttribute('aria-disabled', true);
                opener.classList.add('loading');
                opener.querySelector('.loading-overlay__spinner').classList.remove('hidden');
                fetch(opener.getAttribute('data-product-url')).then(function (response) {
                  return response.text();
                }).then(function (responseText) {
                  var responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
                  _this10.productElement = responseHTML.querySelector('section[id^="MainProduct-"]');
                  _this10.preventDuplicatedIDs();
                  _this10.removeDOMElements();
                  _this10.setInnerHTML(_this10.modalContent, _this10.productElement.innerHTML);
                  if (window.Shopify && Shopify.PaymentButton) {
                    Shopify.PaymentButton.init();
                  }
                  if (window.ProductModel) window.ProductModel.loadShopifyXR();
                  _this10.removeGalleryListSemantic();
                  _this10.updateImageSizes();
                  _this10.preventVariantURLSwitching();
                  _superPropGet(QuickAddModal, "show", _this10, 3)([opener]);
                }).finally(function () {
                  opener.removeAttribute('aria-disabled');
                  opener.classList.remove('loading');
                  opener.querySelector('.loading-overlay__spinner').classList.add('hidden');
                });
              }
            }, {
              key: "setInnerHTML",
              value: function setInnerHTML(element, html) {
                element.innerHTML = html;

                // Reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
                element.querySelectorAll('script').forEach(function (oldScriptTag) {
                  var newScriptTag = document.createElement('script');
                  Array.from(oldScriptTag.attributes).forEach(function (attribute) {
                    newScriptTag.setAttribute(attribute.name, attribute.value);
                  });
                  newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
                  oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
                });
              }
            }, {
              key: "preventVariantURLSwitching",
              value: function preventVariantURLSwitching() {
                var variantPicker = this.modalContent.querySelector('variant-radios,variant-selects');
                if (!variantPicker) return;
                variantPicker.setAttribute('data-update-url', 'false');
              }
            }, {
              key: "removeDOMElements",
              value: function removeDOMElements() {
                var pickupAvailability = this.productElement.querySelector('pickup-availability');
                if (pickupAvailability) pickupAvailability.remove();
                var productModal = this.productElement.querySelector('product-modal');
                if (productModal) productModal.remove();
                var modalDialog = this.productElement.querySelectorAll('modal-dialog');
                if (modalDialog) modalDialog.forEach(function (modal) {
                  return modal.remove();
                });
              }
            }, {
              key: "preventDuplicatedIDs",
              value: function preventDuplicatedIDs() {
                var sectionId = this.productElement.dataset.section;
                this.productElement.innerHTML = this.productElement.innerHTML.replaceAll(sectionId, "quickadd-".concat(sectionId));
                this.productElement.querySelectorAll('variant-selects, variant-radios, product-info').forEach(function (element) {
                  element.dataset.originalSection = sectionId;
                });
              }
            }, {
              key: "removeGalleryListSemantic",
              value: function removeGalleryListSemantic() {
                var galleryList = this.modalContent.querySelector('[id^="Slider-Gallery"]');
                if (!galleryList) return;
                galleryList.setAttribute('role', 'presentation');
                galleryList.querySelectorAll('[id^="Slide-"]').forEach(function (li) {
                  return li.setAttribute('role', 'presentation');
                });
              }
            }, {
              key: "updateImageSizes",
              value: function updateImageSizes() {
                var product = this.modalContent.querySelector('.product');
                var desktopColumns = product.classList.contains('product--columns');
                if (!desktopColumns) return;
                var mediaImages = product.querySelectorAll('.product__media img');
                if (!mediaImages.length) return;
                var mediaImageSizes = '(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';
                if (product.classList.contains('product--medium')) {
                  mediaImageSizes = mediaImageSizes.replace('715px', '605px');
                } else if (product.classList.contains('product--small')) {
                  mediaImageSizes = mediaImageSizes.replace('715px', '495px');
                }
                mediaImages.forEach(function (img) {
                  return img.setAttribute('sizes', mediaImageSizes);
                });
              }
            }]);
          }(ModalDialog));
        }
        if (!customElements.get('pickup-availability')) {
          customElements.define('pickup-availability', /*#__PURE__*/function (_HTMLElement5) {
            function PickupAvailability() {
              var _this11;
              _classCallCheck(this, PickupAvailability);
              _this11 = _callSuper(this, PickupAvailability);
              if (!_this11.hasAttribute('available')) return _possibleConstructorReturn(_this11);
              _this11.errorHtml = _this11.querySelector('template').content.firstElementChild.cloneNode(true);
              _this11.onClickRefreshList = _this11.onClickRefreshList.bind(_this11);
              _this11.fetchAvailability(_this11.dataset.variantId);
              return _this11;
            }
            _inherits(PickupAvailability, _HTMLElement5);
            return _createClass(PickupAvailability, [{
              key: "fetchAvailability",
              value: function fetchAvailability(variantId) {
                var _this12 = this;
                var rootUrl = this.dataset.rootUrl;
                if (!rootUrl.endsWith("/")) {
                  rootUrl = rootUrl + "/";
                }
                var variantSectionUrl = "".concat(rootUrl, "variants/").concat(variantId, "/?section_id=pickup-availability");
                fetch(variantSectionUrl).then(function (response) {
                  return response.text();
                }).then(function (text) {
                  var sectionInnerHTML = new DOMParser().parseFromString(text, 'text/html').querySelector('.shopify-section');
                  _this12.renderPreview(sectionInnerHTML);
                }).catch(function (e) {
                  var button = _this12.querySelector('button');
                  if (button) button.removeEventListener('click', _this12.onClickRefreshList);
                  _this12.renderError();
                });
              }
            }, {
              key: "onClickRefreshList",
              value: function onClickRefreshList(evt) {
                this.fetchAvailability(this.dataset.variantId);
              }
            }, {
              key: "renderError",
              value: function renderError() {
                this.innerHTML = '';
                this.appendChild(this.errorHtml);
                this.querySelector('button').addEventListener('click', this.onClickRefreshList);
              }
            }, {
              key: "renderPreview",
              value: function renderPreview(sectionInnerHTML) {
                var drawer = document.querySelector('pickup-availability-drawer');
                if (drawer) drawer.remove();
                if (!sectionInnerHTML.querySelector('pickup-availability-preview')) {
                  this.innerHTML = "";
                  this.removeAttribute('available');
                  return;
                }
                this.innerHTML = sectionInnerHTML.querySelector('pickup-availability-preview').outerHTML;
                this.setAttribute('available', '');
                document.body.appendChild(sectionInnerHTML.querySelector('pickup-availability-drawer'));
                var button = this.querySelector('button');
                if (button) button.addEventListener('click', function (evt) {
                  document.querySelector('pickup-availability-drawer').show(evt.target);
                });
              }
            }]);
          }(/*#__PURE__*/_wrapNativeSuper(HTMLElement)));
        }
        if (!customElements.get('pickup-availability-drawer')) {
          customElements.define('pickup-availability-drawer', /*#__PURE__*/function (_HTMLElement6) {
            function PickupAvailabilityDrawer() {
              var _this13;
              _classCallCheck(this, PickupAvailabilityDrawer);
              _this13 = _callSuper(this, PickupAvailabilityDrawer);
              _this13.onBodyClick = _this13.handleBodyClick.bind(_this13);
              _this13.querySelector('button').addEventListener('click', function () {
                _this13.hide();
              });
              _this13.addEventListener('keyup', function (event) {
                if (event.code.toUpperCase() === 'ESCAPE') _this13.hide();
              });
              return _this13;
            }
            _inherits(PickupAvailabilityDrawer, _HTMLElement6);
            return _createClass(PickupAvailabilityDrawer, [{
              key: "handleBodyClick",
              value: function handleBodyClick(evt) {
                var target = evt.target;
                if (target != this && !target.closest('pickup-availability-drawer') && target.id != 'ShowPickupAvailabilityDrawer') {
                  this.hide();
                }
              }
            }, {
              key: "hide",
              value: function hide() {
                this.removeAttribute('open');
                document.body.removeEventListener('click', this.onBodyClick);
                document.body.classList.remove('overflow-hidden');
                removeTrapFocus(this.focusElement);
              }
            }, {
              key: "show",
              value: function show(focusElement) {
                this.focusElement = focusElement;
                this.setAttribute('open', '');
                document.body.addEventListener('click', this.onBodyClick);
                document.body.classList.add('overflow-hidden');
                trapFocus(this);
              }
            }]);
          }(/*#__PURE__*/_wrapNativeSuper(HTMLElement)));
        }
        if (!customElements.get('share-button')) {
          customElements.define('share-button', /*#__PURE__*/function (_DetailsDisclosure) {
            function ShareButton() {
              var _this14;
              _classCallCheck(this, ShareButton);
              _this14 = _callSuper(this, ShareButton);
              _this14.elements = {
                shareButton: _this14.querySelector('button'),
                shareSummary: _this14.querySelector('summary'),
                closeButton: _this14.querySelector('.share-button__close'),
                successMessage: _this14.querySelector('[id^="ShareMessage"]'),
                urlInput: _this14.querySelector('input')
              };
              _this14.urlToShare = _this14.elements.urlInput ? _this14.elements.urlInput.value : document.location.href;
              if (navigator.share) {
                _this14.mainDetailsToggle.setAttribute('hidden', '');
                _this14.elements.shareButton.classList.remove('hidden');
                _this14.elements.shareButton.addEventListener('click', function () {
                  navigator.share({
                    url: _this14.urlToShare,
                    title: document.title
                  });
                });
              } else {
                _this14.mainDetailsToggle.addEventListener('toggle', _this14.toggleDetails.bind(_this14));
                _this14.mainDetailsToggle.querySelector('.share-button__copy').addEventListener('click', _this14.copyToClipboard.bind(_this14));
                _this14.mainDetailsToggle.querySelector('.share-button__close').addEventListener('click', _this14.close.bind(_this14));
              }
              return _this14;
            }
            _inherits(ShareButton, _DetailsDisclosure);
            return _createClass(ShareButton, [{
              key: "toggleDetails",
              value: function toggleDetails() {
                if (!this.mainDetailsToggle.open) {
                  this.elements.successMessage.classList.add('hidden');
                  this.elements.successMessage.textContent = '';
                  this.elements.closeButton.classList.add('hidden');
                  this.elements.shareSummary.focus();
                }
              }
            }, {
              key: "copyToClipboard",
              value: function copyToClipboard() {
                var _this15 = this;
                navigator.clipboard.writeText(this.elements.urlInput.value).then(function () {
                  _this15.elements.successMessage.classList.remove('hidden');
                  _this15.elements.successMessage.textContent = window.accessibilityStrings.shareSuccess;
                  _this15.elements.closeButton.classList.remove('hidden');
                  _this15.elements.closeButton.focus();
                });
              }
            }, {
              key: "updateUrl",
              value: function updateUrl(url) {
                this.urlToShare = url;
                this.elements.urlInput.value = url;
              }
            }]);
          }(DetailsDisclosure));
        }
        var ShowMoreButton = /*#__PURE__*/function (_HTMLElement7) {
          function ShowMoreButton() {
            var _this16;
            _classCallCheck(this, ShowMoreButton);
            _this16 = _callSuper(this, ShowMoreButton);
            var button = _this16.querySelector('button');
            button.addEventListener('click', function (event) {
              _this16.expandShowMore(event);
              var nextElementToFocus = event.target.closest('.parent-display').querySelector('.show-more-item');
              if (nextElementToFocus && !nextElementToFocus.classList.contains('hidden')) {
                nextElementToFocus.querySelector('input').focus();
              }
            });
            return _this16;
          }
          _inherits(ShowMoreButton, _HTMLElement7);
          return _createClass(ShowMoreButton, [{
            key: "expandShowMore",
            value: function expandShowMore(event) {
              var parentDisplay = event.target.closest('[id^="Show-More-"]').closest('.parent-display');
              parentDisplay.querySelector('.parent-wrap');
              this.querySelectorAll('.label-text').forEach(function (element) {
                return element.classList.toggle('hidden');
              });
              parentDisplay.querySelectorAll('.show-more-item').forEach(function (item) {
                return item.classList.toggle('hidden');
              });
            }
          }]);
        }(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
        customElements.define('show-more-button', ShowMoreButton);

        /**
         * Product Bundle - Product page functionality and related components
         *
         * This bundle includes product forms, media galleries, modals,
         * quick add functionality, and pickup availability.
         */

        console.log("📦 Product bundle loaded - Product page functionality initialized");
      }
    };
  });
})();
