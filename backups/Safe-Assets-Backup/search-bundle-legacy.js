;
(function () {
  function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
  function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
  function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
  function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
  function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
  function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
  function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function _wrapNativeSuper(t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
  function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
  function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
  function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
  function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
  function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
  function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
  function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
  function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
  function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
  function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
  function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
  function _superPropGet(t, o, e, r) { var p = _get(_getPrototypeOf(1 & r ? t.prototype : t), o, e); return 2 & r && "function" == typeof p ? function (t) { return p.apply(e, t); } : p; }
  function _get() { return _get = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function (e, t, r) { var p = _superPropBase(e, t); if (p) { var n = Object.getOwnPropertyDescriptor(p, t); return n.get ? n.get.call(arguments.length < 3 ? e : r) : n.value; } }, _get.apply(null, arguments); }
  function _superPropBase(t, o) { for (; !{}.hasOwnProperty.call(t, o) && null !== (t = _getPrototypeOf(t));); return t; }
  function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
  function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
  function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
  System.register([], function (exports, module) {
    'use strict';

    return {
      execute: function execute() {
        var PredictiveSearch = /*#__PURE__*/function (_SearchForm) {
          function PredictiveSearch() {
            var _this;
            _classCallCheck(this, PredictiveSearch);
            _this = _callSuper(this, PredictiveSearch);
            _this.cachedResults = {};
            _this.predictiveSearchResults = _this.querySelector('[data-predictive-search]');
            _this.allPredictiveSearchInstances = document.querySelectorAll('predictive-search');
            _this.isOpen = false;
            _this.abortController = new AbortController();
            _this.searchTerm = '';
            _this.setupEventListeners();
            return _this;
          }
          _inherits(PredictiveSearch, _SearchForm);
          return _createClass(PredictiveSearch, [{
            key: "setupEventListeners",
            value: function setupEventListeners() {
              this.input.form.addEventListener('submit', this.onFormSubmit.bind(this));
              this.input.addEventListener('focus', this.onFocus.bind(this));
              this.addEventListener('focusout', this.onFocusOut.bind(this));
              this.addEventListener('keyup', this.onKeyup.bind(this));
              this.addEventListener('keydown', this.onKeydown.bind(this));
            }
          }, {
            key: "getQuery",
            value: function getQuery() {
              return this.input.value.trim();
            }
          }, {
            key: "onChange",
            value: function onChange() {
              _superPropGet(PredictiveSearch, "onChange", this, 3)([]);
              var newSearchTerm = this.getQuery();
              if (!this.searchTerm || !newSearchTerm.startsWith(this.searchTerm)) {
                var _this$querySelector;
                // Remove the results when they are no longer relevant for the new search term
                // so they don't show up when the dropdown opens again
                (_this$querySelector = this.querySelector("#predictive-search-results-groups-wrapper")) === null || _this$querySelector === void 0 || _this$querySelector.remove();
              }

              // Update the term asap, don't wait for the predictive search query to finish loading
              this.updateSearchForTerm(this.searchTerm, newSearchTerm);
              this.searchTerm = newSearchTerm;
              if (!this.searchTerm.length) {
                this.close(true);
                return;
              }
              this.getSearchResults(this.searchTerm);
            }
          }, {
            key: "onFormSubmit",
            value: function onFormSubmit(event) {
              if (!this.getQuery().length || this.querySelector('[aria-selected="true"] a')) event.preventDefault();
            }
          }, {
            key: "onFormReset",
            value: function onFormReset(event) {
              _superPropGet(PredictiveSearch, "onFormReset", this, 3)([event]);
              if (_superPropGet(PredictiveSearch, "shouldResetForm", this, 3)([])) {
                this.searchTerm = '';
                this.abortController.abort();
                this.abortController = new AbortController();
                this.closeResults(true);
              }
            }
          }, {
            key: "onFocus",
            value: function onFocus() {
              var currentSearchTerm = this.getQuery();
              if (!currentSearchTerm.length) return;
              if (this.searchTerm !== currentSearchTerm) {
                // Search term was changed from other search input, treat it as a user change
                this.onChange();
              } else if (this.getAttribute('results') === 'true') {
                this.open();
              } else {
                this.getSearchResults(this.searchTerm);
              }
            }
          }, {
            key: "onFocusOut",
            value: function onFocusOut() {
              var _this2 = this;
              setTimeout(function () {
                if (!_this2.contains(document.activeElement)) _this2.close();
              });
            }
          }, {
            key: "onKeyup",
            value: function onKeyup(event) {
              if (!this.getQuery().length) this.close(true);
              event.preventDefault();
              switch (event.code) {
                case 'ArrowUp':
                  this.switchOption('up');
                  break;
                case 'ArrowDown':
                  this.switchOption('down');
                  break;
                case 'Enter':
                  this.selectOption();
                  break;
              }
            }
          }, {
            key: "onKeydown",
            value: function onKeydown(event) {
              // Prevent the cursor from moving in the input when using the up and down arrow keys
              if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
                event.preventDefault();
              }
            }
          }, {
            key: "updateSearchForTerm",
            value: function updateSearchForTerm(previousTerm, newTerm) {
              var searchForTextElement = this.querySelector("[data-predictive-search-search-for-text]");
              var currentButtonText = searchForTextElement === null || searchForTextElement === void 0 ? void 0 : searchForTextElement.innerText;
              if (currentButtonText) {
                if (currentButtonText.match(new RegExp(previousTerm, "g")).length > 1) {
                  // The new term matches part of the button text and not just the search term, do not replace to avoid mistakes
                  return;
                }
                var newButtonText = currentButtonText.replace(previousTerm, newTerm);
                searchForTextElement.innerText = newButtonText;
              }
            }
          }, {
            key: "switchOption",
            value: function switchOption(direction) {
              if (!this.getAttribute('open')) return;
              var moveUp = direction === 'up';
              var selectedElement = this.querySelector('[aria-selected="true"]');

              // Filter out hidden elements (duplicated page and article resources) thanks
              // to this https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
              var allVisibleElements = Array.from(this.querySelectorAll("li, button.predictive-search__item")).filter(function (element) {
                return element.offsetParent !== null;
              });
              var activeElementIndex = 0;
              if (moveUp && !selectedElement) return;
              var selectedElementIndex = -1;
              var i = 0;
              while (selectedElementIndex === -1 && i <= allVisibleElements.length) {
                if (allVisibleElements[i] === selectedElement) {
                  selectedElementIndex = i;
                }
                i++;
              }
              this.statusElement.textContent = "";
              if (!moveUp && selectedElement) {
                activeElementIndex = selectedElementIndex === allVisibleElements.length - 1 ? 0 : selectedElementIndex + 1;
              } else if (moveUp) {
                activeElementIndex = selectedElementIndex === 0 ? allVisibleElements.length - 1 : selectedElementIndex - 1;
              }
              if (activeElementIndex === selectedElementIndex) return;
              var activeElement = allVisibleElements[activeElementIndex];
              activeElement.setAttribute('aria-selected', true);
              if (selectedElement) selectedElement.setAttribute('aria-selected', false);
              this.input.setAttribute('aria-activedescendant', activeElement.id);
            }
          }, {
            key: "selectOption",
            value: function selectOption() {
              var selectedOption = this.querySelector('[aria-selected="true"] a, button[aria-selected="true"]');
              if (selectedOption) selectedOption.click();
            }
          }, {
            key: "getSearchResults",
            value: function getSearchResults(searchTerm) {
              var _this3 = this;
              var queryKey = searchTerm.replace(" ", "-").toLowerCase();
              this.setLiveRegionLoadingState();
              if (this.cachedResults[queryKey]) {
                this.renderSearchResults(this.cachedResults[queryKey]);
                return;
              }
              fetch("".concat(routes.predictive_search_url, "?q=").concat(encodeURIComponent(searchTerm), "&section_id=predictive-search"), {
                signal: this.abortController.signal
              }).then(function (response) {
                if (!response.ok) {
                  var error = new Error(response.status);
                  _this3.close();
                  throw error;
                }
                return response.text();
              }).then(function (text) {
                var resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive-search').innerHTML;
                // Save bandwidth keeping the cache in all instances synced
                _this3.allPredictiveSearchInstances.forEach(function (predictiveSearchInstance) {
                  predictiveSearchInstance.cachedResults[queryKey] = resultsMarkup;
                });
                _this3.renderSearchResults(resultsMarkup);
              }).catch(function (error) {
                if ((error === null || error === void 0 ? void 0 : error.code) === 20) {
                  // Code 20 means the call was aborted
                  return;
                }
                _this3.close();
                throw error;
              });
            }
          }, {
            key: "setLiveRegionLoadingState",
            value: function setLiveRegionLoadingState() {
              this.statusElement = this.statusElement || this.querySelector('.predictive-search-status');
              this.loadingText = this.loadingText || this.getAttribute('data-loading-text');
              this.setLiveRegionText(this.loadingText);
              this.setAttribute('loading', true);
            }
          }, {
            key: "setLiveRegionText",
            value: function setLiveRegionText(statusText) {
              var _this4 = this;
              this.statusElement.setAttribute('aria-hidden', 'false');
              this.statusElement.textContent = statusText;
              setTimeout(function () {
                _this4.statusElement.setAttribute('aria-hidden', 'true');
              }, 1000);
            }
          }, {
            key: "renderSearchResults",
            value: function renderSearchResults(resultsMarkup) {
              this.predictiveSearchResults.innerHTML = resultsMarkup;
              this.setAttribute('results', true);
              this.setLiveRegionResults();
              this.open();
            }
          }, {
            key: "setLiveRegionResults",
            value: function setLiveRegionResults() {
              this.removeAttribute('loading');
              this.setLiveRegionText(this.querySelector('[data-predictive-search-live-region-count-value]').textContent);
            }
          }, {
            key: "getResultsMaxHeight",
            value: function getResultsMaxHeight() {
              this.resultsMaxHeight = window.innerHeight - document.querySelector('.section-header').getBoundingClientRect().bottom;
              return this.resultsMaxHeight;
            }
          }, {
            key: "open",
            value: function open() {
              this.predictiveSearchResults.style.maxHeight = this.resultsMaxHeight || "".concat(this.getResultsMaxHeight(), "px");
              this.setAttribute('open', true);
              this.input.setAttribute('aria-expanded', true);
              this.isOpen = true;
            }
          }, {
            key: "close",
            value: function close() {
              var clearSearchTerm = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
              this.closeResults(clearSearchTerm);
              this.isOpen = false;
            }
          }, {
            key: "closeResults",
            value: function closeResults() {
              var clearSearchTerm = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
              if (clearSearchTerm) {
                this.input.value = '';
                this.removeAttribute('results');
              }
              var selected = this.querySelector('[aria-selected="true"]');
              if (selected) selected.setAttribute('aria-selected', false);
              this.input.setAttribute('aria-activedescendant', '');
              this.removeAttribute('loading');
              this.removeAttribute('open');
              this.input.setAttribute('aria-expanded', false);
              this.resultsMaxHeight = false;
              this.predictiveSearchResults.removeAttribute('style');
            }
          }]);
        }(SearchForm);
        customElements.define('predictive-search', PredictiveSearch);
        var SearchForm$1 = /*#__PURE__*/function (_HTMLElement) {
          function SearchForm() {
            var _this5;
            _classCallCheck(this, SearchForm);
            _this5 = _callSuper(this, SearchForm);
            _this5.input = _this5.querySelector('input[type="search"]');
            _this5.resetButton = _this5.querySelector('button[type="reset"]');
            if (_this5.input) {
              _this5.input.form.addEventListener('reset', _this5.onFormReset.bind(_this5));
              _this5.input.addEventListener('input', debounce(function (event) {
                _this5.onChange(event);
              }, 300).bind(_this5));
            }
            return _this5;
          }
          _inherits(SearchForm, _HTMLElement);
          return _createClass(SearchForm, [{
            key: "toggleResetButton",
            value: function toggleResetButton() {
              var resetIsHidden = this.resetButton.classList.contains('hidden');
              if (this.input.value.length > 0 && resetIsHidden) {
                this.resetButton.classList.remove('hidden');
              } else if (this.input.value.length === 0 && !resetIsHidden) {
                this.resetButton.classList.add('hidden');
              }
            }
          }, {
            key: "onChange",
            value: function onChange() {
              this.toggleResetButton();
            }
          }, {
            key: "shouldResetForm",
            value: function shouldResetForm() {
              return !document.querySelector('[aria-selected="true"] a');
            }
          }, {
            key: "onFormReset",
            value: function onFormReset(event) {
              // Prevent default so the form reset doesn't set the value gotten from the url on page load
              event.preventDefault();
              // Don't reset if the user has selected an element on the predictive search dropdown
              if (this.shouldResetForm()) {
                this.input.value = '';
                this.input.focus();
                this.toggleResetButton();
              }
            }
          }]);
        }(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
        customElements.define('search-form', SearchForm$1);
        var MainSearch = /*#__PURE__*/function (_SearchForm2) {
          function MainSearch() {
            var _this6;
            _classCallCheck(this, MainSearch);
            _this6 = _callSuper(this, MainSearch);
            _this6.allSearchInputs = document.querySelectorAll('input[type="search"]');
            _this6.setupEventListeners();
            return _this6;
          }
          _inherits(MainSearch, _SearchForm2);
          return _createClass(MainSearch, [{
            key: "setupEventListeners",
            value: function setupEventListeners() {
              var _this7 = this;
              var allSearchForms = [];
              this.allSearchInputs.forEach(function (input) {
                return allSearchForms.push(input.form);
              });
              this.input.addEventListener('focus', this.onInputFocus.bind(this));
              if (allSearchForms.length < 2) return;
              allSearchForms.forEach(function (form) {
                return form.addEventListener('reset', _this7.onFormReset.bind(_this7));
              });
              this.allSearchInputs.forEach(function (input) {
                return input.addEventListener('input', _this7.onInput.bind(_this7));
              });
            }
          }, {
            key: "onFormReset",
            value: function onFormReset(event) {
              _superPropGet(MainSearch, "onFormReset", this, 3)([event]);
              if (_superPropGet(MainSearch, "shouldResetForm", this, 3)([])) {
                this.keepInSync('', this.input);
              }
            }
          }, {
            key: "onInput",
            value: function onInput(event) {
              var target = event.target;
              this.keepInSync(target.value, target);
            }
          }, {
            key: "onInputFocus",
            value: function onInputFocus() {
              var isSmallScreen = window.innerWidth < 750;
              if (isSmallScreen) {
                this.scrollIntoView({
                  behavior: 'smooth'
                });
              }
            }
          }, {
            key: "keepInSync",
            value: function keepInSync(value, target) {
              this.allSearchInputs.forEach(function (input) {
                if (input !== target) {
                  input.value = value;
                }
              });
            }
          }]);
        }(SearchForm);
        customElements.define('main-search', MainSearch);
        var FacetFiltersForm = /*#__PURE__*/function (_HTMLElement2) {
          function FacetFiltersForm() {
            var _this8;
            _classCallCheck(this, FacetFiltersForm);
            _this8 = _callSuper(this, FacetFiltersForm);
            _this8.onActiveFilterClick = _this8.onActiveFilterClick.bind(_this8);
            _this8.debouncedOnSubmit = debounce(function (event) {
              _this8.onSubmitHandler(event);
            }, 500);
            var facetForm = _this8.querySelector('form');
            facetForm.addEventListener('input', _this8.debouncedOnSubmit.bind(_this8));
            var facetWrapper = _this8.querySelector('#FacetsWrapperDesktop');
            if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
            return _this8;
          }
          _inherits(FacetFiltersForm, _HTMLElement2);
          return _createClass(FacetFiltersForm, [{
            key: "createSearchParams",
            value: function createSearchParams(form) {
              var formData = new FormData(form);
              return new URLSearchParams(formData).toString();
            }
          }, {
            key: "onSubmitForm",
            value: function onSubmitForm(searchParams, event) {
              FacetFiltersForm.renderPage(searchParams, event);
            }
          }, {
            key: "onSubmitHandler",
            value: function onSubmitHandler(event) {
              var _this9 = this;
              event.preventDefault();
              var sortFilterForms = document.querySelectorAll('facet-filters-form form');
              if (event.srcElement.className == 'mobile-facets__checkbox') {
                var searchParams = this.createSearchParams(event.target.closest('form'));
                this.onSubmitForm(searchParams, event);
              } else {
                var forms = [];
                var isMobile = event.target.closest('form').id === 'FacetFiltersFormMobile';
                sortFilterForms.forEach(function (form) {
                  if (!isMobile) {
                    if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
                      var noJsElements = document.querySelectorAll('.no-js-list');
                      noJsElements.forEach(function (el) {
                        return el.remove();
                      });
                      forms.push(_this9.createSearchParams(form));
                    }
                  } else if (form.id === 'FacetFiltersFormMobile') {
                    forms.push(_this9.createSearchParams(form));
                  }
                });
                this.onSubmitForm(forms.join('&'), event);
              }
            }
          }, {
            key: "onActiveFilterClick",
            value: function onActiveFilterClick(event) {
              event.preventDefault();
              FacetFiltersForm.toggleActiveFacets();
              var url = event.currentTarget.href.indexOf('?') == -1 ? '' : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
              FacetFiltersForm.renderPage(url);
            }
          }], [{
            key: "setListeners",
            value: function setListeners() {
              var onHistoryChange = function onHistoryChange(event) {
                var searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
                if (searchParams === FacetFiltersForm.searchParamsPrev) return;
                FacetFiltersForm.renderPage(searchParams, null, false);
              };
              window.addEventListener('popstate', onHistoryChange);
            }
          }, {
            key: "toggleActiveFacets",
            value: function toggleActiveFacets() {
              var disable = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
              document.querySelectorAll('.js-facet-remove').forEach(function (element) {
                element.classList.toggle('disabled', disable);
              });
            }
          }, {
            key: "renderPage",
            value: function renderPage(searchParams, event) {
              var updateURLHash = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
              FacetFiltersForm.searchParamsPrev = searchParams;
              var sections = FacetFiltersForm.getSections();
              var countContainer = document.getElementById('ProductCount');
              var countContainerDesktop = document.getElementById('ProductCountDesktop');
              document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');
              if (countContainer) {
                countContainer.classList.add('loading');
              }
              if (countContainerDesktop) {
                countContainerDesktop.classList.add('loading');
              }
              sections.forEach(function (section) {
                var url = "".concat(window.location.pathname, "?section_id=").concat(section.section, "&").concat(searchParams);
                var filterDataUrl = function filterDataUrl(element) {
                  return element.url === url;
                };
                FacetFiltersForm.filterData.some(filterDataUrl) ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event) : FacetFiltersForm.renderSectionFromFetch(url, event);
              });
              if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
            }
          }, {
            key: "renderSectionFromFetch",
            value: function renderSectionFromFetch(url, event) {
              fetch(url).then(function (response) {
                return response.text();
              }).then(function (responseText) {
                var html = responseText;
                FacetFiltersForm.filterData = [].concat(_toConsumableArray(FacetFiltersForm.filterData), [{
                  html: html,
                  url: url
                }]);
                FacetFiltersForm.renderFilters(html, event);
                FacetFiltersForm.renderProductGridContainer(html);
                FacetFiltersForm.renderProductCount(html);
              });
            }
          }, {
            key: "renderSectionFromCache",
            value: function renderSectionFromCache(filterDataUrl, event) {
              var html = FacetFiltersForm.filterData.find(filterDataUrl).html;
              FacetFiltersForm.renderFilters(html, event);
              FacetFiltersForm.renderProductGridContainer(html);
              FacetFiltersForm.renderProductCount(html);
            }
          }, {
            key: "renderProductGridContainer",
            value: function renderProductGridContainer(html) {
              document.getElementById('ProductGridContainer').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer').innerHTML;
            }
          }, {
            key: "renderProductCount",
            value: function renderProductCount(html) {
              var count = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount').innerHTML;
              var container = document.getElementById('ProductCount');
              var containerDesktop = document.getElementById('ProductCountDesktop');
              container.innerHTML = count;
              container.classList.remove('loading');
              if (containerDesktop) {
                containerDesktop.innerHTML = count;
                containerDesktop.classList.remove('loading');
              }
            }
          }, {
            key: "renderFilters",
            value: function renderFilters(html, event) {
              var parsedHTML = new DOMParser().parseFromString(html, 'text/html');
              var facetDetailsElements = parsedHTML.querySelectorAll('#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter');
              var matchesIndex = function matchesIndex(element) {
                var jsFilter = event ? event.target.closest('.js-filter') : undefined;
                return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
              };
              var facetsToRender = Array.from(facetDetailsElements).filter(function (element) {
                return !matchesIndex(element);
              });
              var countsToRender = Array.from(facetDetailsElements).find(matchesIndex);
              facetsToRender.forEach(function (element) {
                document.querySelector(".js-filter[data-index=\"".concat(element.dataset.index, "\"]")).innerHTML = element.innerHTML;
              });
              FacetFiltersForm.renderActiveFacets(parsedHTML);
              FacetFiltersForm.renderAdditionalElements(parsedHTML);
              if (countsToRender) FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
            }
          }, {
            key: "renderActiveFacets",
            value: function renderActiveFacets(html) {
              var activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];
              activeFacetElementSelectors.forEach(function (selector) {
                var activeFacetsElement = html.querySelector(selector);
                if (!activeFacetsElement) return;
                document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
              });
              FacetFiltersForm.toggleActiveFacets(false);
            }
          }, {
            key: "renderAdditionalElements",
            value: function renderAdditionalElements(html) {
              var mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];
              mobileElementSelectors.forEach(function (selector) {
                if (!html.querySelector(selector)) return;
                document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
              });
              document.getElementById('FacetFiltersFormMobile').closest('menu-drawer').bindEvents();
            }
          }, {
            key: "renderCounts",
            value: function renderCounts(source, target) {
              var targetElement = target.querySelector('.facets__selected');
              var sourceElement = source.querySelector('.facets__selected');
              var targetElementAccessibility = target.querySelector('.facets__summary');
              var sourceElementAccessibility = source.querySelector('.facets__summary');
              if (sourceElement && targetElement) {
                target.querySelector('.facets__selected').outerHTML = source.querySelector('.facets__selected').outerHTML;
              }
              if (targetElementAccessibility && sourceElementAccessibility) {
                target.querySelector('.facets__summary').outerHTML = source.querySelector('.facets__summary').outerHTML;
              }
            }
          }, {
            key: "updateURLHash",
            value: function updateURLHash(searchParams) {
              history.pushState({
                searchParams: searchParams
              }, '', "".concat(window.location.pathname).concat(searchParams && '?'.concat(searchParams)));
            }
          }, {
            key: "getSections",
            value: function getSections() {
              return [{
                section: document.getElementById('product-grid').dataset.id
              }];
            }
          }]);
        }(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
        FacetFiltersForm.filterData = [];
        FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
        FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
        customElements.define('facet-filters-form', FacetFiltersForm);
        FacetFiltersForm.setListeners();
        var PriceRange = /*#__PURE__*/function (_HTMLElement3) {
          function PriceRange() {
            var _this0;
            _classCallCheck(this, PriceRange);
            _this0 = _callSuper(this, PriceRange);
            _this0.querySelectorAll('input').forEach(function (element) {
              return element.addEventListener('change', _this0.onRangeChange.bind(_this0));
            });
            _this0.setMinAndMaxValues();
            return _this0;
          }
          _inherits(PriceRange, _HTMLElement3);
          return _createClass(PriceRange, [{
            key: "onRangeChange",
            value: function onRangeChange(event) {
              this.adjustToValidValues(event.currentTarget);
              this.setMinAndMaxValues();
            }
          }, {
            key: "setMinAndMaxValues",
            value: function setMinAndMaxValues() {
              var inputs = this.querySelectorAll('input');
              var minInput = inputs[0];
              var maxInput = inputs[1];
              if (maxInput.value) minInput.setAttribute('max', maxInput.value);
              if (minInput.value) maxInput.setAttribute('min', minInput.value);
              if (minInput.value === '') maxInput.setAttribute('min', 0);
              if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
            }
          }, {
            key: "adjustToValidValues",
            value: function adjustToValidValues(input) {
              var value = Number(input.value);
              var min = Number(input.getAttribute('min'));
              var max = Number(input.getAttribute('max'));
              if (value < min) input.value = min;
              if (value > max) input.value = max;
            }
          }]);
        }(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
        customElements.define('price-range', PriceRange);
        var FacetRemove = /*#__PURE__*/function (_HTMLElement4) {
          function FacetRemove() {
            var _this1;
            _classCallCheck(this, FacetRemove);
            _this1 = _callSuper(this, FacetRemove);
            var facetLink = _this1.querySelector('a');
            facetLink.setAttribute('role', 'button');
            facetLink.addEventListener('click', _this1.closeFilter.bind(_this1));
            facetLink.addEventListener('keyup', function (event) {
              event.preventDefault();
              if (event.code.toUpperCase() === 'SPACE') _this1.closeFilter(event);
            });
            return _this1;
          }
          _inherits(FacetRemove, _HTMLElement4);
          return _createClass(FacetRemove, [{
            key: "closeFilter",
            value: function closeFilter(event) {
              event.preventDefault();
              var form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
              form.onActiveFilterClick(event);
            }
          }]);
        }(/*#__PURE__*/_wrapNativeSuper(HTMLElement));
        customElements.define('facet-remove', FacetRemove);

        /**
         * Search Bundle - Search functionality and related components
         *
         * This bundle includes predictive search, search forms, facets,
         * and all search-related features.
         */

        console.log("🔍 Search bundle loaded - Search functionality initialized");
      }
    };
  });
})();
