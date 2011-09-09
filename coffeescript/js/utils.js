(function() {
    var doc = document;
    var disableBuilds = false;
    var disableNotes = false;

    var ctr = 0;
    var spaces = /\s+/, a1 = [''];

    var toArray = function(list) {
        return Array.prototype.slice.call(list || [], 0);
    };

    var byId = function(id) {
        if (typeof id == 'string') { return doc.getElementById(id); }
        return id;
    };

    var query = function(query, root) {
        return queryAll(query, root)[0];
    };

    var queryAll = function(query, root) {
        if (!query) { return []; }
        if (typeof query != 'string') { return toArray(query); }
        if (typeof root == 'string') {
            root = byId(root);
            if(!root){ return []; }
        }

        root = root || document;
        var rootIsDoc = (root.nodeType == 9);
        var doc = rootIsDoc ? root : (root.ownerDocument || document);

        // rewrite the query to be ID rooted
        if (!rootIsDoc || ('>~+'.indexOf(query.charAt(0)) >= 0)) {
            root.id = root.id || ('qUnique' + (ctr++));
            query = '#' + root.id + ' ' + query;
        }
        // don't choke on something like ".yada.yada >"
        if ('>~+'.indexOf(query.slice(-1)) >= 0) { query += ' *'; }
        return toArray(doc.querySelectorAll(query));
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

    var addClass = function(node, classStr) {
        classStr = strToArray(classStr);
        var cls = ' ' + node.className + ' ';
        for (var i = 0, len = classStr.length, c; i < len; ++i) {
            c = classStr[i];
            if (c && cls.indexOf(' ' + c + ' ') < 0) {
                cls += c + ' ';
            }
        }
        node.className = trim(cls);
    };

    var removeClass = function(node, classStr) {
        var cls;
        if (classStr !== undefined) {
            classStr = strToArray(classStr);
            cls = ' ' + node.className + ' ';
            for (var i = 0, len = classStr.length; i < len; ++i) {
                cls = cls.replace(' ' + classStr[i] + ' ', ' ');
            }
            cls = trim(cls);
        } else {
            cls = '';
        }
        if (node.className != cls) {
            node.className = cls;
        }
    };

    var toggleClass = function(node, classStr) {
        var cls = ' ' + node.className + ' ';
        if (cls.indexOf(' ' + trim(classStr) + ' ') >= 0) {
            removeClass(node, classStr);
        } else {
            addClass(node, classStr);
        }
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

    // Resig's document.ready impl
    function addEvent( obj, type, fn ) {
        if ( obj.attachEvent ) {
            obj['e'+type+fn] = fn;
            obj[type+fn] = function(){obj['e'+type+fn]( window.event );}
            obj.attachEvent( 'on'+type, obj[type+fn] );
        } else
            obj.addEventListener( type, fn, false );
    }
    var documentReady = ( function () {
        function ready( f ) {
            if( ready.done ) return f();

            if( ready.timer ) {
                ready.ready.push(f);
            } else {
                addEvent( window, "load", isDOMReady );
                ready.ready = [ f ];
                ready.timer = setInterval(isDOMReady, 13);
            }
        };

        function isDOMReady() {
            if( ready.done ) return false;

            if( document && document.getElementsByTagName && document.getElementById && document.body ) {
                clearInterval( ready.timer );
                ready.timer = null;
                for( var i = 0; i < ready.ready.length; i++ ) {
                    ready.ready[i]();
                }
                ready.ready = null;
                ready.done = true;
            }
        }

        return ready;
    })();

    //
    // Slide class
    //
    var Slide = function(node, idx) {
        this._node = node;
        this._editorNode = query('.editor', node);
        var note = query('.note > section', node);
        this._speakerNote = note ? note.innerHTML : '';
        var editorContent = query('.editor-content', node);
        this._editorContent = editorContent ? unescapeHTML(editorContent.innerHTML) : '';
        this._editorJSBuffer = query('.editor-jsbuffer', node);
        this._editorConsole = query('.editor-console', node);
        if (idx >= 0) {
            this._count = idx + 1;
        }
        if (this._node) {
            addClass(this._node, 'slide distant-slide');
        }
        // this._makeCounter();
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
            removeClass(this._node, this._states);
            addClass(this._node, state);
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
            var frames = queryAll('iframe', this._node);
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
            var frames = queryAll('iframe', this._node);
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
            if (disableBuilds) { return; }
            if (this._node) {
                this._buildList = queryAll('[data-build] > *', this._node);
            }
            this._buildList.forEach(function(el) {
                addClass(el, 'to-build');
            });
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
                        elem.parentNode.removeEventListener('webkitTransitionEnd', l, false);
                        elem.parentNode.removeEventListener('transitionend', l, false);  // moz
                        elem.parentNode.removeEventListener('oTransitionEnd', l, false);
                        _t._runAutos();
                    };
                    elem.parentNode.addEventListener('webkitTransitionEnd', l, false);
                    elem.parentNode.addEventListener('transitionend', l, false);
                    elem.parentNode.addEventListener('oTransitionEnd', l, false);
                    removeClass(elem, 'to-build');
                } else {
                    setTimeout(function() {
                        removeClass(elem, 'to-build');
                        _t._runAutos();
                    }, 400);
                }
            }
        },
        getSpeakerNote: function() {
            return this._speakerNote;
        },
        getEditorNode: function() {
            return this._editorNode;
        },
        getEditorContent: function() {
            return this._editorContent;
        },
        getEditorJSBuffer: function() {
            return this._editorJSBuffer;
        },
        getEditorConsole: function() {
            return this._editorConsole;
        },
        toggleJSBuffer: function(editor) {
            toggleClass(this._node, "hide-jsbuffer");
            editor.resize();
        },
        buildNext: function() {
            if (!this._buildList.length) {
                return false;
            }
            removeClass(this._buildList.shift(), 'to-build');
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
        if (!query('#' + this.current)) {
            // if this happens is very likely that someone is coming from
            // a link with the old permalink format, i.e. #slide24
            alert('The format of the permalinks have recently changed. If you are coming ' +
                  'here from an old external link it\'s very likely you will land to the wrong slide');
            this.current = "landing-slide";
        }
        var _t = this;
        doc.addEventListener('keydown',
                             function(e) { _t.handleKeys(e); }, false);
        doc.addEventListener('click',
                             function(e) { _t.handleMouseClick(e); }, false);
        doc.addEventListener('touchstart',
                             function(e) { _t.handleTouchStart(e); }, false);
        doc.addEventListener('touchend',
                             function(e) { _t.handleTouchEnd(e); }, false);
        window.addEventListener('popstate',
                                function(e) { if (e.state) { _t.go(e.state, true); } }, false);
        documentReady(function() {
            _t._update();
        });
    };

    SlideShow.prototype = {
        _presentationCounter: query('#presentation-counter'),
        _speakerNote: query('#speaker-note'),
        _slides: [],
        _editor: null,
        _getCurrentIndex: function() {
            var me = this;
            var slideCount = null;
            queryAll('.slide').forEach(function(slide, i) {
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

            var editorConsole = this._slides[currentIndex - 1].getEditorConsole();
            if (editorConsole) editorConsole.innerHTML = "";
            var editorJSBuffer = this._slides[currentIndex - 1].getEditorJSBuffer();
            if (editorJSBuffer) editorJSBuffer.innerHTML = "";

            if (this._editor !== null) this._editor.destroy();
            var editor, editorNode = this._slides[currentIndex - 1].getEditorNode();
            var editorContent = this._slides[currentIndex - 1].getEditorContent();
            var _t = this;
            var CoffeeMode = require("ace/mode/coffee").Mode;
            if (editorNode) {
                removeClass(editorNode, "visible");
                editor = this._editor = ace.edit(editorNode);
                editor.getSession().setMode(new CoffeeMode());
                editor.getSession().setUseSoftTabs(true);
                editor.getSession().setTabSize(2);
                editor.setTheme("ace/theme/textmate");
                addClass(editorNode, "visible");
                setTimeout(function() {
                    editor.getSession().setValue(editorContent);
                    editor.focus();
                    editor.navigateFileEnd();
                });
                editor.getSession().on("change", function(e) {
                    if (_t._changeTimer !== null) {
                        clearTimeout(_t._changeTimer);
                        _t._changeTimer = null;
                    }
                    _t._changeTimer = setTimeout(function() {
                        _t._changeTimer = null;
                        _t._updateEditor();
                    }, 500);
                });
                editor.currentSlide = this._slides[currentIndex - 1];
            } else {
                this._editor = null;
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
        changeTheme: function() {
            var linkEls = queryAll('link.theme');
            var sheetIndex = 0;
            linkEls.forEach(function(stylesheet, i) {
                if (!stylesheet.disabled) {
                    sheetIndex = i;
                }
            });
            linkEls[sheetIndex].disabled = true;
            linkEls[(sheetIndex + 1) % linkEls.length].disabled = false;
            sessionStorage['theme'] = linkEls[(sheetIndex + 1) % linkEls.length].href;
        },
        focusEditor: function() {
            var editor = this._editor;
            if (editor) setTimeout(function() {
                editor.focus();
            });
        },
        _updateEditor: function() {
            var editor = this._editor;
            if (!editor) return;
            var rendered = this._slides[this._getCurrentIndex() - 1].getEditorJSBuffer();

            try {
                var compiled = CoffeeScript.compile(editor.getSession().getValue(), { bare: true });
                rendered.innerHTML = compiled;
                prettyPrintNode(rendered);
            } catch (error) {
            }
        },
        runCode: function() {
            var editor = this._editor;
            if (!editor) return;
            var _console = this._slides[this._getCurrentIndex() - 1].getEditorConsole();

            var selection = editor.getSelectionRange();
            if (selection.start.row === selection.end.row && selection.start.column === selection.end.column) selection = null;
            var code = selection ? editor.getSession().doc.getTextRange(selection) : editor.getSession().getValue();

            var output = ">> " + escapeHTML(code).trim().replace(/\n/g, "\n>> ");
            output = "<span class=\"input\">" + output + "</span>\n";

            code = "wrap_func = ->\n  " + code.replace(/\n/g, "\n  ") + "\nreturn wrap_func()";

            var result = null, error = null;
            try {
                var compiled = CoffeeScript.compile(code);
                result = eval(compiled);
            } catch (x) {
                error = x;
            }

            if (error) {
                _console.innerHTML = output + "<span class=\"error\">" + escapeHTML(error.toString()) + "</span>";
            } else {
                var resultText = JSON.stringify(result, null, 1);
                if (resultText)
                    resultText = resultText.replace(/\n/g, "");
                else
                    resultText = "" + result;
                _console.innerHTML = output + "<span class=\"output\">" + escapeHTML(resultText) + "</span>";
                prettyPrintNode(query("span.output", _console));
            }
            _console.scrollTop = _console.scrollHeight;
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
                // case 84: // T
                //   this.changeTheme(); break;
            case 13: // Return
                this.focusEditor(); break;
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
        },
    };

    // disable style theme stylesheets
    var linkEls = queryAll('link.theme');
    var stylesheetPath = sessionStorage['theme'] || 'css/moon.css';
    linkEls.forEach(function(stylesheet) {
        stylesheet.disabled = !(stylesheet.href.indexOf(stylesheetPath) != -1);
    });

    // Initialize
    var li_array = [];
    var transitionSlides = queryAll('.transitionSlide').forEach(function(el) {
        li_array.push( ['<li><a data-hash="', el.id, '">',
                        query('h2', el).textContent, '</a><img src="',
                        query('img', el).src.replace(/64/g, '32'),
                        '"/></li>'].join('')
                     );
    });

    //  query('#toc-list').innerHTML = li_array.join('');

    queryAll("div.editor-content").forEach(function(div) {
        var parent = div.parentNode;
        var editor = document.createElement("div");
        addClass(editor, "editor");
        var jsBuffer = document.createElement("pre");
        addClass(jsBuffer, "editor-jsbuffer");
        var console = document.createElement("pre");
        addClass(console, "editor-console");
        parent.appendChild(editor);
        parent.appendChild(jsBuffer);
        parent.appendChild(console);
    });

    var slideshow = new SlideShow(queryAll('.slide'));

    function bindKey(key) {
        return {
            win: key,
            mac: key,
            sender: "editor"
        };
    }

    var canon = require("pilot/canon");
    canon.addCommand({
        name: "slideForward",
        bindKey: bindKey("Ctrl-Alt-Right"),
        exec: function(env, args, request) {
            env.editor.blur();
            slideshow.next();
        }
    });
    canon.addCommand({
        name: "slideForward2",
        bindKey: bindKey("PageDown"),
        exec: function(env, args, request) {
            env.editor.blur();
            slideshow.next();
        }
    });
    canon.addCommand({
        name: "slideBack",
        bindKey: bindKey("Ctrl-Alt-Left"),
        exec: function(env, args, request) {
            env.editor.blur();
            slideshow.prev();
        }
    });
    canon.addCommand({
        name: "slideBack2",
        bindKey: bindKey("PageUp"),
        exec: function(env, args, request) {
            env.editor.blur();
            slideshow.prev();
        }
    });
    canon.addCommand({
        name: "runCode",
        bindKey: bindKey("Alt-R"),
        exec: function(env, args, request) { slideshow.runCode(); }
    });
    canon.addCommand({
        name: "removetolineend",
        bindKey: bindKey("Ctrl-K"),
        exec: function(env, args, request) { env.editor.removeToLineEnd(); }
    });
    canon.addCommand({
        name: "scrollJSBuffer",
        bindKey: bindKey("Alt-V"),
        exec: function(env, args, request) {
            var jsBuf = env.editor.currentSlide.getEditorJSBuffer();
            if (jsBuf.scrollLeft === 0) {
                jsBuf.scrollLeft = jsBuf.scrollWidth;
            } else {
                jsBuf.scrollLeft = 0;
            }
        }
    });
    canon.addCommand({
        name: "toggleJSBuffer",
        bindKey: bindKey("Ctrl-1"),
        exec: function(env, args, request) { env.editor.currentSlide.toggleJSBuffer(env.editor); }
    });
    canon.addCommand({
        name: "splitLine",
        bindKey: bindKey("Ctrl-Return"),
        exec: function(env, args, request) { env.editor.splitLine(); }
    });

    document.addEventListener('DOMContentLoaded', function() {
        query('.slides').style.display = 'block';
    }, false);

    queryAll('#toc-list li a').forEach(function(el) {
        el.onclick = function() { slideshow.go(el.dataset['hash']); };
    });

    queryAll('pre').forEach(function(el) {
        addClass(el, 'prettyprint');
    });

})();
