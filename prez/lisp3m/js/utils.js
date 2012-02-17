(function() {
    var doc = document;
    var disableBuilds = false;
    var disableNotes = false;

    var ctr = 0;
    var spaces = /\s+/, a1 = [''];

    var toArray = function(list) {
        return Array.prototype.slice.call(list || [], 0);
    };

    var query = function(query, root) {
        return $(query, root)[0];
    };

    var strToArray = function(s) {
        if (typeof s == 'string' || s instanceof String) {
            if (s.indexOf(' ') < 0) {
                a1[0] = s;
                return a1;
            } else {
                return s.split(spaces);
            }
        }
        return s;
    };

    // Needed for browsers that don't support String.trim() (e.g. iPad)
    var trim = function(str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };


    // modernizr lite via https://gist.github.com/598008
    var testStyle = function(style) {

        var elem = document.createElement('div');
        var prefixes = ['Webkit', 'Moz', 'O', 'ms', 'Khtml'];
        var bool;
        var bump = function(all, letter) {
            return letter.toUpperCase();
        };
        var prop;

        bool = style in elem.style;
        prop = style.replace(/^(.)/, bump).replace(/-([a-z])/ig, bump);

        for (var len = prefixes.length; len--; ){
            if (bool) {
                break;
            }
            bool = prefixes[len] + prop in elem.style;
        }

        document.documentElement.className += ' ' + (bool ? '' : 'no-') + style.replace(/-/g, '');
        return bool;
    };

    var canTransition = testStyle('transition');

    var unescapeHTML = function(s) {
        return s.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
    };

    var escapeHTML = function(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };


    //
    // Slide class
    //
    var Slide = function(node, idx) {
        this._node = node;
        var note = $('.note > section', node);
        this._speakerNote = note ? note.html() : '';
        if (idx >= 0) {
            this._count = idx + 1;
        }
        if (this._node) {
            $(this._node).addClass("slide distant-slide");
        }
        this._makeBuildList();
    };

    Slide.prototype = {
        _node: null,
        _count: 0,
        _buildList: [],
        _visited: false,
        _currentState: '',
        _states: [ 'distant-slide', 'far-past',
                   'past', 'current', 'future',
                   'far-future', 'distant-slide' ],
        setState: function(state) {
            if (typeof state != 'string') {
                state = this._states[state];
            }
            if (state == 'current' && !this._visited) {
                this._visited = true;
                this._makeBuildList();
            }
            var n = $(this._node);
            this._states.forEach(function(e) { n.removeClass(e); });
            n.addClass(state);
            this._currentState = state;

            // delay first auto run. Really wish this were in CSS.
            /*
              this._runAutos();
            */
            var _t = this;
            setTimeout(function(){ _t._runAutos(); } , 400);

            if (state == 'current') {
                this._onLoad();
            } else {
                this._onUnload();
            }
        },
        _onLoad: function() {
            this._fireEvent('onload');
            this._showFrames();
        },
        _onUnload: function() {
            this._fireEvent('onunload');
            this._hideFrames();
        },
        _fireEvent: function(name) {
            var eventSrc = this._node.getAttribute(name);
            if (eventSrc) {
                eventSrc = '(function() { ' + eventSrc + ' })';
                var fn = eval(eventSrc);
                fn.call(this._node);
            }
        },
        _showFrames: function() {
            var frames = $('iframe', this._node);
            function show() {
                frames.forEach(function(el) {
                    var _src = el.getAttribute('_src');
                    if (_src && _src.length) {
                        el.src = _src;
                    }
                });
            }
            setTimeout(show, 0);
        },
        _hideFrames: function() {
            var frames = $('iframe', this._node);
            function hide() {
                frames.forEach(function(el) {
                    var _src = el.getAttribute('_src');
                    if (_src && _src.length) {
                        el.src = '';
                    }
                });
            }
            setTimeout(hide, 250);
        },
        _makeCounter: function() {
            if(!this._count || !this._node) { return; }
            var c = doc.createElement('span');
            c.textContent = this._count;
            c.className = 'counter';
            this._node.appendChild(c);
        },
        _makeBuildList: function() {
            this._buildList = [];
            this._buildCycle = false;
            this._parenSlide = false;
            if (disableBuilds) { return; }
            if (this._node) {
                this._buildList = $("span.paren-slide", this._node);
                if (this._buildList.length) {
                    this._parenSlide = true;
                    return;
                }
                this._buildList = $('[data-cycle] > *', this._node);
                if (this._buildList.length) {
                    this._buildCycle = true;
                    this._buildCyclePrev = this._buildList.shift();
                    $(this._buildCyclePrev).removeClass("to-cycle");
                    $(this._buildList).addClass("to-cycle");
                } else {
                    this._buildList = $('[data-build] > *', this._node).addClass("to-build");
                }
            }
        },
        _runAutos: function() {
            if (this._currentState != 'current') {
                return;
            }
            // find the next auto, slice it out of the list, and run it
            var idx = -1;
            this._buildList.some(function(n, i) {
                if (n.hasAttribute('data-auto')) {
                    idx = i;
                    return true;
                }
                return false;
            });
            if (idx >= 0) {
                var elem = this._buildList.splice(idx, 1)[0];

                var _t = this;
                if (canTransition) {
                    var l = function(evt) {
                        $(elem.parentNode).unbind("webkitTransitionEnd", l)
                            .unbind("transitionend", l)
                            .unbind("oTransitionEnd", l);
                        _t._runAutos();
                    };
                    $(elem.parentNode).on("webkitTransitionEnd", l)
                        .on("transitionend", l)
                        .on("oTransitionEnd", l);
                    $(elem).removeClass("to-build");
                } else {
                    setTimeout(function() {
                        $(elem).removeClass("to-build");
                        _t._runAutos();
                    }, 400);
                }
            }
        },
        getSpeakerNote: function() {
            return this._speakerNote;
        },
        buildNext: function() {
            if (!this._buildList.length) {
                return false;
            }
            if (this._parenSlide) {
                $("span.paren-slide", this._node).addClass("paren-slide-animate");
                this._buildList = [];
            } else if (this._buildCycle) {
                $(this._buildCyclePrev).addClass("to-cycle");
                this._buildCyclePrev = this._buildList.shift();
                $(this._buildCyclePrev).removeClass("to-cycle");
            } else {
                $(this._buildList.shift()).removeClass("to-build");
            }
            return true;
        }
    };

    //
    // SlideShow class
    //
    var SlideShow = function(slides) {
        this._slides = (slides || []).map(function(el, idx) {
            return new Slide(el, idx);
        });
        var h = window.location.hash;
        try {
            this.current = h;
        } catch (e) { /* squeltch */ }
        this.current = (!this.current) ? "landing-slide" : this.current.replace('#', '');
        if (!$('#' + this.current)) {
            // if this happens is very likely that someone is coming from
            // a link with the old permalink format, i.e. #slide24
            alert('The format of the permalinks have recently changed. If you are coming ' +
                  'here from an old external link it\'s very likely you will land to the wrong slide');
            this.current = "landing-slide";
        }
        var _t = this;
        $(doc).on("keydown", function(e) { _t.handleKeys(e); });
        $(doc).on("click", function(e) { _t.handleMouseClick(e); });
        $(doc).on("touchstart", function(e) { _t.handleTouchStart(e); });
        $(doc).on("touchend", function(e) { _t.handleTouchEnd(e); });
        $(window).on("popstate", function(e) { if (e.state) { _t.go(e.state, true); } });
        $.domReady(function() { _t._update(); });
    };

    SlideShow.prototype = {
        _presentationCounter: query('#presentation-counter'),
        _speakerNote: query('#speaker-note'),
        _slides: [],
        _getCurrentIndex: function() {
            var me = this;
            var slideCount = null;
            $('.slide').forEach(function(slide, i) {
                if (slide.id == me.current) {
                    slideCount = i;
                }
            });
            return slideCount + 1;
        },
        _update: function(targetId, dontPush) {
            // in order to delay the time where the counter shows the slide number we check if
            // the slides are already loaded (so we show the loading... instead)
            // the technique to test visibility is taken from here
            // http://stackoverflow.com/questions/704758/how-to-check-if-an-element-is-really-visible-with-javascript
            var currentIndex = this._getCurrentIndex();

            if (targetId) {
                var savedIndex = currentIndex;
                this.current = targetId;
                currentIndex = this._getCurrentIndex();
                if (Math.abs(savedIndex - currentIndex) > 1) {
                    // if the current switch is not "prev" or "next", we need clear
                    // the state setting near the original slide
                    for (var x = savedIndex; x < savedIndex + 7; x++) {
                        if (this._slides[x-4]) {
                            this._slides[x-4].setState(0);
                        }
                    }
                }
            }
            var docElem = document.documentElement;
            var elem = document.elementFromPoint( docElem.clientWidth / 2, docElem.clientHeight / 2);
            if (elem && elem.className != 'presentation') {
                this._presentationCounter.textContent = currentIndex;
            }
            this._speakerNote.innerHTML = this._slides[currentIndex - 1].getSpeakerNote();

            if (history.pushState) {
                if (!dontPush) {
                    history.replaceState(this.current, 'Slide ' + this.current, '#' + this.current);
                }
            } else {
                window.location.hash = this.current;
            }
            for (var x = currentIndex; x < currentIndex + 7; x++) {
                if (this._slides[x-4]) {
                    this._slides[x-4].setState(x-currentIndex);
                }
            }
        },

        current: 0,
        next: function() {
            if (!this._slides[this._getCurrentIndex() - 1].buildNext()) {
                var next = query('#' + this.current + ' + .slide');
                //this.current = (next) ? next.id : this.current;
                this._update((next) ? next.id : this.current);
            }
        },
        prev: function() {
            var prev = query('.slide:nth-child(' + (this._getCurrentIndex() - 1) + ')');
            //this.current = (prev) ? prev.id : this.current;
            this._update((prev) ? prev.id : this.current);
        },
        go: function(slideId, dontPush) {
            //this.current = slideId;
            this._update(slideId, dontPush);
        },

        _notesOn: false,
        showNotes: function() {
            if (disableNotes) {
                return;
            }
            var isOn = this._notesOn = !this._notesOn;
            this._speakerNote.style.display = "block";
            this._speakerNote.classList.toggle('invisible');
        },
        switch3D: function() {
            toggleClass(document.body, 'three-d');
        },
        handleKeys: function(e) {
            if (/^(input|textarea)$/i.test(e.target.nodeName) || e.target.isContentEditable) {
                return;
            }

            switch (e.keyCode) {
            case 37: // left arrow
            case 33: // Prior
                this.prev(); break;
            case 39: // right arrow
                // case 32: // space
            case 34: // Next
                this.next(); break;
                // case 51: // 3
                //   this.switch3D(); break;
            case 78: // N
                this.showNotes(); break;
            }
        },
        handleMouseClick: function(e) {
            // if (e.target.tagName !== "A") {
            //     this.next();
            // }
        },
        _touchStartX: 0,
        handleTouchStart: function(e) {
            this._touchStartX = e.touches[0].pageX;
        },
        handleTouchEnd: function(e) {
            var delta = this._touchStartX - e.changedTouches[0].pageX;
            var SWIPE_SIZE = 150;
            if (delta > SWIPE_SIZE) {
                this.next();
            } else if (delta< -SWIPE_SIZE) {
                this.prev();
            }
        }
    };

    // Initialize
    var slideshow = new SlideShow($('.slide'));
    $('pre').addClass("prettyprint");

    /*
     * Presentation timer: liberally borrowed from http://github.com/LeaVerou/CSSS
     */
    (function() {
        var duration = parseInt($("body").attr("data-duration"), 10);
        if (duration > 0) {
            var createTimer = function(id, duration) {
                var timer = document.createElement("div");
                $(timer).attr("id", id) .attr("style", PrefixFree.prefixCSS("transition: " + duration * 60 + "s linear"));
                $("body").append(timer);
                setTimeout(function() { timer.className = "end"; }, 1);
            };
            createTimer("timer", duration);
            createTimer("nyan-timer", duration);
        }
    })();
})();
