---
title: Building TodoMVC With vgtk
date: 2020-02-20
tags: post
layout: post.liquid
---

The [`vgtk`][vgtk] project started out as a side effect of one of my "must write a text editor"
phases, as many things do. It triggers a review of the state of UI development in my current
favourite language, and sometimes it triggers a ground-up attempt to construct an ad-hoc,
informally-specified, bug-ridden, slow implementation of half of [Elm], when I decide the state of
the art is insufficient for my tastes. Usually, if the ground is sparsely trodden, I never get
further than building some of the developer tooling necessary to build the UI tooling I need to
build my text editor.

In this latest case, thanks to the superlative state of Rust's developer tooling—and its low level
bindings for at least one sufficiently qualified UI toolkit—I've gotten to the point where I've been
able to build UI tooling that appeals to my idea of what UI tooling should look and feel like. So
far, I've yet to build the text editor, but I've come to accept by now that it will only ever exist
as a Platonic ideal, serving only as a motivating force to get me started building more useful
things.

I'll try to introduce `vgtk`, idea by idea, by way of a tutorial. You'll need to have a working
knowledge of [Rust] to follow along. You shouldn't need to know [GTK] already, but you may need to
be prepared to consult GTK documentation to understand certain things fully.

<!--more-->

## Where Did It Come From?

At first glance, a `vgtk` code example (this one from the project's `README` file) tends to look a
little disorienting:

```rust
fn view(&self) -> VNode<Model> {
    gtk! {
        <Application::new_unwrap(None, ApplicationFlags::empty())>
            <Window border_width=20 on destroy=|_| Message::Exit>
                <HeaderBar title="inc!" show_close_button=true />
                <Box spacing=10 halign=Align::Center>
                    <Label label=self.counter.to_string() />
                    <Button label="inc!" image="add" always_show_image=true
                            on clicked=|_| Message::Inc />
                </Box>
            </Window>
        </Application>
    }
}
```

What the eye sees is [React]. When stepping back, it's clearly Rust code, but the [JSX] like syntax
of the view function tends to draw your attention and make you wonder if you're seeing Rust or
something else. This is intentional: JSX has grown from that weird idea that made people dismiss
React out of hand to practically a de facto standard of declaring HTML based UI components, and it
turns out that it translates well to any UI toolkit based around tree structures, which happens to
be all of them, so (thanks to Rust's powerful procedural macros letting us embed very nearly any DSL
we want into Rust code) we can leverage the familiarity of JSX to reduce our learning curve
somewhat. We need to extend JSX's syntax a little bit to work around the peculiarities of GTK, but
it still looks largely like JSX. And, like JSX, it translates directly into code. In Rust, that
means we can type check the markup: if you pass the wrong kind of argument to an attribute, for
instance, or mistype the name of an element, you will get a type error from the compiler.

As well as the JSX syntax, `vgtk` has borrowed a slightly simplified version of React's component
model. `vgtk` is structured around [`Component`][component]s, which can be nested inside the JSX
structures of each other, just like in React, in order to build reusable UI components. This model
is very similar to the one found in the [Yew] web framework for Rust, which is perhaps the chief
source of inspiration for `vgtk`. If you like what you see here, but you want to do web development
instead, you'll like [Yew] a lot.

Components follow the "Model-View-Update" pattern of the [Elm architecture]. Like in Elm and
[Redux], data flows in a single direction through the component: the view function describes how and
which user input is handled, user input flows into the update function to adjust the component state
(the "Model"), the update function feeds state into the view function, and so on in an endless
cycle. If you've heard of MVC, "Model-View-Controller," this is an expression of that basic pattern,
but more constrained—in a good way, as it turns out—in how it handles data flow.

### Buzzword Compliant Rust

GTK is built on top of [GLib]'s event loop, which, it turns out, is like a battle hardened C version
of [async-std] or [Tokio] (at least if you consider it along with [GIO]). The [Gtk-rs] project
provides, in addition to the GTK bindings, a fully functional [`Future`][futures] executor on top of
GLib, which means that we can use Rust's `async`/`await` style of async programming when writing GTK
based applications. `vgtk` embraces this: [`Component`][component]s are async tasks, signal handlers
are async functions, and the update function can spawn async jobs as needed.

A drawback here is that [GLib] and [GIO] bindings aren't quite as nice to use as [async-std] and
[Tokio], from a Rust programmer's perspective, and I might wish for a companion library to `vgtk`
which provides a more ergonomic interface to GIO for when your components need to talk to networks
and file systems. I might even wish that we could have async I/O libraries that were independent of
the executors they run on, but this seems to remain a utopian ideal.

## Getting Started

Enough talk, let's write some code. First, you'll need a working
[Rust environment](https://www.rust-lang.org/learn/get-started) and a working
[GTK installation](https://gtk-rs.org/docs-src/requirements). For the latter, it's an easy install
unless you're on Windows, for which I can only say it's possible, I've gotten it working on multiple
Windows machines, but you must follow the instructions to the letter, as tedious as it is.

Before we start, be aware that the Rust compiler is going to complain at you about "recursion limit
reached" a couple of times as you work through this tutorial. Whenever this happens, it tells you to
add an attribute to your crate, that looks like `#![recursion_limit = "some number"]`. Just add that
as a new line at the top of your file, or replace the previous one if it's happened before, and
rustc will stop complaining. Don't worry about it, it's a limit rustc enforces to keep things
spiralling out of control, but we've got a lot of room to expand before it gets to be a problem.
We're not taking it anywhere near problem territory, but it's a truth generally acknowledged that
anything you can do in Rust that's really worth doing will exceed the default recursion limit.

We'll use [`cargo generate`][cargo-generate] to start a new `vgtk` project. If you don't have
`cargo generate` installed, I recommend that you do so now (`cargo install cargo-generate`), or
check out the [`cargo-template-vgtk`][cargo-template-vgtk] repo manually.

```
$ cargo generate --git https://github.com/bodil/cargo-template-vgtk --name vgtk-todomvc
$ cd vgtk-todomvc
$ cargo run
```

After a while, your project will finish compiling, and your very first shadow of a `vgtk`
application should appear on your desktop:

{% gif "template-app.png" %}

Let's open the `src/main.rs` file that `cargo-generate` made for us and see what's in it.

First of all, there's a model:

```rust
#[derive(Clone, Debug, Default)]
struct Model {}
```

There's no state needed for the little window with a label in it that you just saw, so the model,
for now, contains nothing.

Next, there's the message enum:

```rust
#[derive(Clone, Debug)]
enum Message {
    Exit,
}
```

The only enum variant is `Message::Exit`, which is all the application does right now: when you
click the window close button, it exits.

Next, there's the [`Component`][component] implementation. This is where things get interesting.

We note the two associated type declarations, one for the message type we just declared and one for
the component's properties. A top level component does not have properties, so the unit type `()` is
used.

```rust
type Message = Message;
type Properties = ();
```

Next, there's the update function. All it does is respond to the `Message::Exit` message by exiting
the application. It returns [`UpdateAction::None`][updateaction::none], which tells the system that
it doesn't need to re-render the component when this happens.

```rust
fn update(&mut self, msg: Self::Message) -> UpdateAction<Self> {
    match msg {
        Message::Exit => {
            vgtk::quit();
            UpdateAction::None
        }
    }
}
```

And then there's the view function. This is where you declare how the application is rendered. The
`gtk!` macro takes a markup tree and turns it into a bit of Rust code that generates a
`VNode<Model>`, as you can see the return type requires. A [`VNode`][vnode] is something similar to
a DOM node, except it describes the state of a tree of GTK widgets, without actually constructing
any. The `vgtk` runtime will take this and render it into an actual tree of GTK widgets, or use it
to efficiently update a previously rendered one.

```rust
fn view(&self) -> VNode<Model> {
    gtk! {
        <Application::new_unwrap(Some("com.example.vgtk-tutorial"), ApplicationFlags::empty())>
            <Window border_width=20 on destroy=|_| Message::Exit>
                <Label label="vgtk-tutorial" />
            </Window>
        </Application>
    }
}
```

There's a lot of syntax here. Let's start at the outer level with the [`Application`][application]
widget.

Your top level component should render into an [`Application`][application] widget, containing any
number of [`Window`][window]s. Each [`Window`][window] contains either one or two children: an
optional header widget (in our case, we don't use one, which gets us system standard window
decorations instead) plus a content widget—that's the [`Label`][label].

Mostly, elements look the same as HTML elements. In some cases, we need to call special
constructors, and [`Application`][application] is one of these cases. In fact, we need to call the
[`new_unwrap`][new_unwrap] constructor, which isn't even in [Gtk-rs], but is provided by one of
`vgtk`'s helper traits. This is because the usual constructor,
[`Application::new`][application::new], returns a `Result` and the `gtk!` macro expects an
[`Application`][application], so [`new_unwrap`][new_unwrap] just calls the regular constructor and
then [`unwrap`][unwrap]s the result.

The `gtk!` macro accepts regular Rust constructor syntax in place of just an element name for this
purpose, as you can see above. In general, though, try to avoid using constructors unless you really
have to, because the values provided to a constructor can't be changed once constructed, so `vgtk`
simply ignores these values when it's updating the widget tree after initial construction. On the
other hand, values in element attributes will be updated properly.

If you're familiar with JSX, you'll also note that the `gtk!` macro is slightly smarter than JSX in
that, instead of wrapping values in a `{}` block, you can provide Rust expressions directly, as with
the `border_width=20` attribute on the [`Window`][window] element. `gtk!`'s parser can handle most
Rust expressions, but it isn't perfect, so if you throw something at it that it doesn't know how to
handle, you can always just wrap it in a `{}` block.

The final bit of syntax to note is the signal handler on the [`Window`][window]:
`on destroy=|_| Message::Exit`. Signal handlers start with the `on` keyword, and tells `vgtk`, in
this case, that when the [`Window`][window]'s `destroy` signal is emitted, we should call the
provided callback function. This maps directly to the window's [`connect_destroy`][connect_destroy]
method, and the arguments to the callback are the same as for the callback that method takes. In
this case, the only argument is a reference to the widget emitting the signal, which we don't care
about, hence the `_`. The return value is different from the GTK callback, though: you should return
a message of your component's message type, rather than nothing, to let the component know what to
do next.

Finally, there's the `main()` function, which is just a bit of boilerplate to get the application up
and running. It first initialises logging using [`pretty_env_logger`][pretty_env_logger], a plugin
for the [`log`][log] framework which `vgtk` uses to provide debug logging. You can use any logging
frontend you like, but this one is a good default as it's uncomplicated and, as its name suggests,
pretty.

Next, we call the [`vgtk::run`][vgtk::run] function with our component (`Model`) as a type argument,
which spins up the GTK main loop and constructs our application. Note that you don't provide an
instance of your component, just the type of it. `vgtk` will instantiate it when the time comes
using its `Default` implementation.

```rust
fn main() {
    pretty_env_logger::init();
    std::process::exit(run::<Model>());
}
```

## GTK's Event Model

Wait, "signals?"

### Signals

Signals are how GTK widgets communicate. Each widget has a number of named signals (which are
conceptually identical to events on DOM elements) that are emitted when certain things happen, to
which you can attach callback functions. You've already seen [`destroy`][connect_destroy], which is
a signal common to all GTK widgets, and is emitted when the widget is—as you might have guessed
already, if you can translate from Dalek—being removed. We use it above to find out when the user
has closed the window, which means it's time to exit the application's main loop.

Generally, when a widget provides a signal, it will have a `connect_signal_name` method letting you
attach callbacks to it. When you use the `on signal_name=callback` syntax in the `gtk!` macro, what
it really does, in effect, is generate a call to `widget.connect_signal_name(callback)` for you. If
you're wondering what signals a widget provides, your best bet is usually to look for the
`connect_signal_name` methods. The [Gtk-rs] documentation is generally pretty bad at describing them
other than through their connect methods. The [original GTK docs][gtkwidget.signals] are more
comprehensive, and slightly easier to navigate, but beware that, while the signals are the same,
they describe the C API, not Rust.

`vgtk` modifies the signal handler callbacks a little, though: instead of having no return value,
you're supposed to return a value of your component's `Component::Message` type instead. This value
will be sent directly to the component's update function, allowing you to respond to the signal.

Moreover, you can declare callbacks `async`, allowing you to do all sorts of things before
eventually returning a `Component::Message` value for your update function. Beware of putting too
much complexity into your signal callbacks, though, it's probably better to organise complex
operations elsewhere.

### Properties

In addition to named signals, there are also named _properties._ These map directly to the
attributes you've seen on elements in the `gtk!` macro, and are used to configure your widgets, or
to contain user state. Generally, a property will have a pair of `get_property` and `set_property`
methods, and this is what the `gtk!` macro maps them to. For instance, the `label` attribute above
on `<Label label="vgtk-tutorial" />` causes the `gtk!` macro to generate calls to
[`get_label()`][get_label] and [`set_label()`][set_label] on the [`Label`][label] widget.

In an ideal world, when a GTK widget declares a property, the [Gtk-rs] bindings always come with
`get_property` and `set_property` methods to match it. In the real world, however, this isn't always
the case, which is why the [`vgtk::ext`][vgtk::ext] module exists. It tries to work around the
inconsistencies and provide properly named getters and setters for everything, but it's far from
complete. If you find something obvious missing, bug reports or pull requests are very
welcome.{% footnote "1" %}

## Adding Component State

Now that we understand GTK a little better, let's try extending our app to actually manage some
state.

What kind of state?

Obviously, we're going to make a todo list app, as the article's title promised, and as is the Law
of UI toolkit tutorials.

So let's add a list of strings to our `Model`:

```rust
#[derive(Clone, Debug, Default)]
struct Model {
    tasks: Vec<String>,
}
```

We're going to have to update our view function to render that list. A good GTK widget for holding a
list of things is [`ListBox`][listbox], so we're going to replace our label with that.

But first, as we have no way of adding to that list yet, let's make a custom `Default`
implementation that starts us off with a couple of strings to render. Take the `Default` out of the
list of derives for `Model` and add an implementation for it like this:

```rust
#[derive(Clone, Debug)]
struct Model {
    tasks: Vec<String>,
}

impl Default for Model {
    fn default() -> Self {
        Self {
            tasks: vec![
                "Call Joe".to_string(),
                "Call Mike".to_string(),
                "Call Robert".to_string(),
                "Get Robert to fix the bug".to_string(),
            ],
        }
    }
}
```

Now, to render that, we're going to construct the aforementioned [`ListBox`][listbox]. Inside it, we
make a [`ListBoxRow`][listboxrow] for each item in our list. A [`ListBoxRow`][listboxrow] takes one
child widget, which can be whatever we like. We're rendering strings, so we're going to use a
[`Label`][label], like the one we had before.

```rust
fn view(&self) -> VNode<Model> {
    gtk! {
        <Application::new_unwrap(Some("com.example.vgtk-tutorial"), ApplicationFlags::empty())>
            <Window border_width=20 on destroy=|_| Message::Exit>
                <ListBox>
                    {
                        self.tasks.iter().map(|task| gtk! {
                            <ListBoxRow>
                                <Label label=task.clone() />
                            </ListBoxRow>
                        })
                    }
                </ListBox>
            </Window>
        </Application>
    }
}
```

This uses the `gtk!` macro's interpolation syntax, much like how you'd insert child elements
programmatically in JSX. Instead of a child element tag, we use a `{}` code block. This code block
should return an iterator of `VNode<Model>`—the same type your `gtk!` macro produces. So we get an
iterator for our list, and map it to render a [`ListBoxRow`][listboxrow] using another `gtk!` macro.
Note that we need to `clone()` that string for the `label` property, because `task` is a reference
that won't outlive the iterator.

Let's `cargo run` that and see what happens.

{% gif "a-basic-list.png" %}

That's our list in that list box! Try it out, you can highlight each item with the mouse or the
keyboard.

## Adding A Checkbox

It's supposed to be a todo list, though, so it needs a checkbox to indicate whether each item is
done, and we need the model to know whether the checkbox should be checked or not.

That means a list of strings is no longer adequate. Let's make a new type which contains all the
state we need for a single task.

```rust
#[derive(Clone, Debug)]
struct Task {
    text: String,
    done: bool,
}

impl Task {
    fn new<S: ToString>(text: S, done: bool) -> Self {
        Self {
            text: text.to_string(),
            done,
        }
    }
}
```

We'll need to update our model accordingly:

```rust
#[derive(Clone, Debug)]
struct Model {
    tasks: Vec<Task>,
}

impl Default for Model {
    fn default() -> Self {
        Self {
            tasks: vec![
                Task::new("Call Joe", true),
                Task::new("Call Mike", true),
                Task::new("Call Robert", false),
                Task::new("Get Robert to fix the bug", false),
            ],
        }
    }
}
```

Given that we now have a `Task` type, we can teach it how to render itself, which also makes the
main view function a little tidier. Add a `render()` method to the `Task` implementation like this:

```rust
fn render(&self) -> VNode<Model> {
    gtk! {
        <ListBoxRow>
            <Label label=self.text.clone() />
        </ListBoxRow>
    }
}
```

If we update the `Model`'s view function accordingly, the code block now becomes a lot cleaner:

```rust
fn view(&self) -> VNode<Model> {
    gtk! {
        <Application::new_unwrap(Some("com.example.vgtk-tutorial"), ApplicationFlags::empty())>
            <Window border_width=20 on destroy=|_| Message::Exit>
                <ListBox>
                    {
                        self.tasks.iter().map(Task::render)
                    }
                </ListBox>
            </Window>
        </Application>
    }
}
```

But what about the checkbox? Let's update the `Task`'s render function to include it. GTK provides a
[`CheckButton`][checkbutton] widget for this purpose, but a [`ListBoxRow`][listboxrow] only accepts
one widget, so it's time to introduce the [`Box`][box]. A [`Box`][box] is a layout widget which
takes any number of children, and lays them out next to each other. It's the `<div>` of the GTK
world. It can be configured to lay out its children either horizontally or vertically, but
horizontal is the default, so we won't bother specifying it here.

```rust
fn render(&self) -> VNode<Model> {
    gtk! {
        <ListBoxRow>
            <Box>
                <CheckButton active=self.done />
                <Label label=self.text.clone() />
            </Box>
        </ListBoxRow>
    }
}
```

Let's run it and see how it looks now:

{% gif "checked-list.png" %}

That's our list, with checkboxes, and they reflect the state we created: Joe and Mike are checked,
while the remaining tasks are not. You can even go and check and uncheck the items as you like,
because those checkboxes are real buttons. They won't update the state when you do, though, which is
going to be the focus of our next problem.

## Reacting To User Input

According to the [TodoMVC] spec, which is the law in these parts, a task item that has been checked
should be rendered with a strikeout effect. Let's see if we can add that to our render method.

[`Label`][label] supports a subset of HTML markup, if we set the `use_markup=true` property, and we
can use this to render our strikeout effect. Let's extend our render method to do this, and adjust
the alpha value of the text down a bit so it looks greyed out as well. Let's also add a `label()`
method to `Task` to render that string for us, keeping our render method clean.

```rust
fn label(&self) -> String {
    if self.done {
        format!(
            "<span strikethrough=\"true\" alpha=\"50%\">{}</span>",
            self.text
        )
    } else {
        self.text.clone()
    }
}

fn render(&self) -> VNode<Model> {
    gtk! {
        <ListBoxRow>
            <Box>
                <CheckButton active=self.done />
                <Label label=self.label() use_markup=true />
            </Box>
        </ListBoxRow>
    }
}
```

And now it looks like this:

{% gif "strikeout-tasks.png" %}

However, if you try and check or uncheck the items, you'll notice that the strikeouts don't change
along with the checkbox state. We'll need to actually update our model in response to the checkboxes
to achieve this. The first thing we need to do is add a message to describe an item changing state:

```rust
#[derive(Clone, Debug)]
enum Message {
    Exit,
    Toggle { index: usize },
}
```

This tells the model that the user wants to toggle the task at index `index` in our list. We'll have
to change our update function accordingly to handle it:

```rust
fn update(&mut self, msg: Self::Message) -> UpdateAction<Self> {
    match msg {
        Message::Exit => {
            vgtk::quit();
            UpdateAction::None
        }
        Message::Toggle { index } => {
            self.tasks[index].done = !self.tasks[index].done;
            UpdateAction::Render
        }
    }
}
```

Note that when we handle the `Toggle` message, we return
[`UpdateAction::Render`][updateaction::render], to let the system know that the model has changed
and it should therefore re-render the component to reflect it. When `vgtk` gets an
[`UpdateAction::Render`][updateaction::render] response from an update function, what happens next
is that it calls the component's view function, and updates the widget tree to match it.

We also have to get the system to actually send that `Message::Toggle` message, but in order to be
able to send the message, the `Task::render()` function will need to know what index it's at. We'll
have to update the component's view function to give it that information.

```rust
    fn view(&self) -> VNode<Model> {
        gtk! {
            <Application::new_unwrap(Some("com.example.vgtk-tutorial"), ApplicationFlags::empty())>
                <Window border_width=20 on destroy=|_| Message::Exit>
                    <ListBox>
                        {
                            self.tasks.iter().enumerate().map(|(index, task)| task.render(index))
                        }
                    </ListBox>
                </Window>
            </Application>
        }
    }
```

And, finally, we update the `Task`'s render function to take the index as an argument, and—this is
the crucial bit—to add a signal handler to send the message. The signal you want is `toggled`.

```rust
fn render(&self, index: usize) -> VNode<Model> {
    gtk! {
        <ListBoxRow>
            <Box>
                <CheckButton active=self.done on toggled=|_| Message::Toggle { index } />
                <Label label=self.label() use_markup=true />
            </Box>
        </ListBoxRow>
    }
}
```

Try `cargo run` again, and you'll notice the strikeouts update in sync with the checkboxes!

Even more excitingly, we can turn on console logging (remember that `pretty_env_logger::init()`
line?) and watch the messages being sent. You can enable logging by setting the environment variable
`RUST_LOG` to `debug` (or `trace` if you really like massive amounts of debug output).

If you're using bash or zsh, you can set this for your `cargo run` invocation by prepending the
variable assignment, like this:

```
$ RUST_LOG=debug cargo run
```

If you're a PowerShell user or a discerning [Fish shell](https://fishshell.com/) user, use the `env`
command like this:

```
$ env RUST_LOG=debug cargo run
```

And the result, in its full glory, comes out something like this, when you play around with checking
and unchecking a few boxes before closing the app:

<pre style="background: black; color: #ddd; font-size: 0.86em"><b>$ env</b> <font color="#06989A">RUST_LOG=debug</font> <font color="#06989A">cargo</font> <font color="#06989A">run</font>
<font color="#4E9A06"><b>    Finished</b></font> dev [unoptimized + debuginfo] target(s) in 0.04s
<font color="#4E9A06"><b>     Running</b></font> `target/debug/vgtk-tutorial`
<font color="#3465A4">DEBUG</font> <b>vgtk</b> &gt; <font color="#729FCF">Application has activated.</font>
<font color="#3465A4">DEBUG</font> <b>vgtk::component</b> &gt; <font color="#729FCF">Component mounted:</font> <font color="#75507B"><b>vgtk_tutorial::Model</b></font>
<font color="#3465A4">DEBUG</font> <b>vgtk::scope    </b> &gt; <font color="#4E9A06">Scope::send_message</font> <font color="#75507B"><b>vgtk_tutorial::Model</b></font>: <font color="#EEEEEC"><b>Toggle { index: 1 }</b></font>
<font color="#3465A4">DEBUG</font> <b>vgtk::scope    </b> &gt; <font color="#4E9A06">Scope::send_message</font> <font color="#75507B"><b>vgtk_tutorial::Model</b></font>: <font color="#EEEEEC"><b>Toggle { index: 3 }</b></font>
<font color="#3465A4">DEBUG</font> <b>vgtk::scope    </b> &gt; <font color="#4E9A06">Scope::send_message</font> <font color="#75507B"><b>vgtk_tutorial::Model</b></font>: <font color="#EEEEEC"><b>Toggle { index: 2 }</b></font>
<font color="#3465A4">DEBUG</font> <b>vgtk::scope    </b> &gt; <font color="#4E9A06">Scope::send_message</font> <font color="#75507B"><b>vgtk_tutorial::Model</b></font>: <font color="#EEEEEC"><b>Toggle { index: 2 }</b></font>
<font color="#3465A4">DEBUG</font> <b>vgtk::scope    </b> &gt; <font color="#4E9A06">Scope::send_message</font> <font color="#75507B"><b>vgtk_tutorial::Model</b></font>: <font color="#EEEEEC"><b>Exit</b></font>
<font color="#3465A4">DEBUG</font> <b>vgtk::component</b> &gt; <font color="#EF2929">Component unmounted:</font> <font color="#75507B"><b>vgtk_tutorial::Model</b></font>
</pre>

## An Input Box

This clearly has the makings of a wonderful app, but there's a chance not everyone is going to need
to deal with Joe, Mike and Robert all the time, so it might be best if we add the ability for users
to add and remove tasks. The first part of that will involve adding an input box into which the user
can type their new tasks.

The GTK input box widget is called [`Entry`][entry]. To fit one into our widget tree, we're going to
have to insert a vertical [`Box`][box] to contain the current [`ListBox`][listbox] as well as our
input box.

```rust
fn view(&self) -> VNode<Model> {
    gtk! {
        <Application::new_unwrap(Some("com.example.vgtk-tutorial"), ApplicationFlags::empty())>
            <Window border_width=20 on destroy=|_| Message::Exit>
                <Box orientation=Orientation::Vertical spacing=10>
                    <Entry placeholder_text="What needs to be done?" />
                    <ListBox Box::fill=true Box::expand=true>
                        {
                            self.tasks.iter().enumerate().map(|(index, task)| task.render(index))
                        }
                    </ListBox>
                </Box>
            </Window>
        </Application>
    }
}
```

There are a few new things to note here. First, this time we want a vertical box, so we have to
specify the `orientation` property. This takes a value of type [`gtk::Orientation`][orientation]. We
also specify the `spacing` property to add a little bit of space between the input box and the list
box.

We've also added some unusual looking properties to the list box: `Box::fill` and `Box::expand`.
Properties using this syntax are called _child properties_, which, in GTK, aren't actually set on
the widget in question, but on its parent. The `gtk!` macro needs to know what type the parent is in
order to generate the right code, and the [`Box::`][box] prefix serves to specify the parent type as
well as to distinguish this as a child property.

The `fill` and `expand` properties let the parent know that the child wants all the space it can
get, while their absence implies the child is content with minimal space in the layout direction. We
want the task list to expand to fit the window as we resize it, while we want the input box to stay
the same height whatever the size of the window. Try resizing the window to see how the task list
expands. Then try temporarily removing the `fill` and `expand` properties from the task list and
seeing how it behaves differently.

Now, to make the input box actually respond to input. We can safely let the input box handle its own
internal state as the user is typing, we just want to know when the new task is ready to be added.
For this, we'll listen to the [`activate`][connect_activate] signal. This is triggered when the user
hits the Enter key. The signal doesn't emit what the user entered, just the fact that it was
activated, but every signal handler receives the widget that emitted it as its first argument, so we
can use this to inspect the contents of the widget.

First, though, we'll need another `Message` to let the model know we want to add a task. We'll call
it `Add`.

```rust
#[derive(Clone, Debug)]
enum Message {
    Exit,
    Toggle { index: usize },
    Add { task: String },
}
```

We need to extend the model's update function to respond to this message:

```rust
match msg {
    ...
    Message::Add { task } => {
        self.tasks.push(Task::new(task, false));
        UpdateAction::Render
    }
}
```

Finally, we add the `activate` listener to the [`Entry`][entry] widget:

```rust
<Entry placeholder_text="What needs to be done?"
        on activate=|entry| {
            entry.select_region(0, -1);
            Message::Add {
                task: entry.get_text().unwrap().to_string()
            }
        } />
```

This callback has a side effect in addition to the message being sent to the model: it selects the
entered text, so the user can more easily start writing a new task. The
[`select_region`][select_region] method takes two arguments: the start of the selection and the
length of it. The special value of `-1` for the length means to select to the end of the entered
string.

We can now enter new tasks:

{% gif "text-entry.png" %}

## A Scrollable List

However, as you might have noticed if you tried it, adding to the list causes the window to grow,
because we're increasing the minimum layout size of the list when we add to it. It scale a little
better if the list were scrollable instead. To accomplish this, we're going to add a
[`ScrolledWindow`][scrolledwindow] around the [`ListBox`][listbox]. Despite its name,
[`ScrolledWindow`][scrolledwindow] isn't actually a window, it's a container widget that wraps a
single child and adds scrollbars to it when neccesary to let it fit on screen instead of endlessly
growing the window.

While we're at it, let's also turn off the selection indicator on the [`ListBox`][listbox], because
we're not actually going to need it for anything, and it's cramping our aesthetic a little bit.

So let's replace the `<ListBox>` in our view function with this:

```rust
<ScrolledWindow Box::fill=true Box::expand=true>
    <ListBox selection_mode=SelectionMode::None>
        {
            self.tasks.iter().enumerate().map(|(index, task)| task.render(index))
        }
    </ListBox>
</ScrolledWindow>
```

Note that we moved the `Box::fill` and `Box::expand` attributes up from the list box to the
[`ScrolledWindow`][scrolledwindow], because the list box is no longer the [`Box`][box]'s child, the
[`ScrolledWindow`][scrolledwindow] is. We don't need any layout properties on the list box as a
child of [`ScrolledWindow`][scrolledwindow], it knows how to take care of its children on its own.

The property we use to turn off the selection indicator is [`selection_mode`][set_selection_mode].

But now it ends up looking really cramped!

{% gif "cramped.png" %}

The [`ScrolledWindow`][scrolledwindow] only requests the minimal amount of space it needs to render
itself, rather than the size of the list box, so the minimum width of the window has now decreased
significantly. Unless we tell it otherwise, our window is going to open as small as it possibly can.
Therefore, we're going to have to tell it to start out a little bigger.

Let's update the `<Window>` tag in the view function like this:

```rust
<Window default_width=800 default_height=600
        border_width=20 on destroy=|_| Message::Exit>
    ...
</Window>
```

This will set the starting size of your window to the standard SVGA display size of 800x600. This
ought to be enough for anyone.

## Adventures With Icon Themes

We also want to be able to delete tasks. One way to do this would be to re-enable that list box
selection indicator we just turned off, and add a "delete" button or menu item somewhere that works
on the current selection, but the TodoMVC spec has different ideas: we're going to add an individual
delete button to each task item in the list. This has the advantage of being quite a bit easier to
do, so let's roll with it.

As you've come to expect by now, that means, first of all, a new message in our message type.

```rust
#[derive(Clone, Debug)]
enum Message {
    Exit,
    Toggle { index: usize },
    Add { task: String },
    Delete { index: usize },
```

Along with the corresponding addition to our update function:

```rust
match msg {
    ...
    Message::Delete { index } => {
        self.tasks.remove(index);
        UpdateAction::Render
    }
}
```

Next, we add a button to the `Task` type's render function:

```rust
fn render(&self, index: usize) -> VNode<Model> {
    gtk! {
        <ListBoxRow>
            <Box>
                <CheckButton active=self.done on toggled=|_| Message::Toggle { index } />
                <Label label=self.label() use_markup=true />
                <Button label="Delete" on clicked=|_| Message::Delete { index } />
            </Box>
        </ListBoxRow>
    }
}
```

And that's it! There's now a button next to each item that you can click to remove it, and it's as
easy as just three quick additions to our code.

Except it looks _really bad._ Really, _really_ bad.

{% gif "wtf.png" %}

That button is way too big, and it needs to be aligned along the right edge of the list box, not
just plonked down in the middle of the row wherever the label ends. It would also be nice if,
instead of a big glaring boldface "delete," we could have a discrete little icon indicating a
deletion.

So, let's re-style the input box row a little bit. Your first thought might be that we could just
use `Box::fill` and `Box::expand` to make the label grow to fill all the space that isn't strictly
needed by the buttons on either side, which should right align the button neatly. That was my
thought too, but even when adding a [`justify`][set_justify] property to the label, there seems to
be no way to keep the text left aligned instead of centered, so a different plan is required.

Fortunately, it's very straightforward: [`Box`][box] has another child property called `pack_type`
which takes a value of type [`PackType`][packtype] to indicate which end of the [`Box`][box] to add
the child widget. We can set `pack_type=PackType::End` on the delete button, and it'll be added
right at the end of the box, just like we wanted.

Now, let's see if we can style the button a little less obtrusively. First of all, we can remove the
button border by setting the `relief` property to [`ReliefStyle::None`][reliefstyle::none].

We can also replace the label text with an icon, at least in theory—GTK can pull icons out of system
icon themes by name, _if_ your system has the idea of GTK icon themes. If you're on a system with a
GNOME desktop, or something vaguely similar to one, you're good. If you're on Windows, I really hope
you followed those GTK installation instructions to the letter, especially the bit where it told you
to grab a GNOME icon set and extract it in the right place, or you're probably not going to see any
icons at all.

Let's update the `<Button>` tag in the `Task` render function:

```rust
<Button Box::pack_type=PackType::End
        relief=ReliefStyle::None image="edit-delete"
        on clicked=|_| Message::Delete { index } />
```

That looks _much_ better.

{% gif "pretty-delete-button.png" %}

## Making A Subcomponent

The TodoMVC spec calls for a row of filter buttons below the list box, allowing you to toggle
between displaying all tasks, just the active ones, or just the completed ones. We could implement
this by adding three toggle buttons directly, but this seems like a great opportunity to show off
some _abstraction._

Thinking ahead, don't you think we're going to need that pattern a lot in our app? A series of
mutually exclusive buttons to choose between filters? Well, no, this list is all there is to this
app and we're not going to need to re-use this at all, but _what if we did?_

It's time for a subcomponent.

You already know how to build components—this application we've built is a component. A subcomponent
differs from a top level component in two notable ways: one, it doesn't have to return an
[`Application`][application], it can return any widget or GLib object, and two, where a top level
component is always constructed using its `Default` implementation, a subcomponent can be configured
using properties, just like GTK widgets.

Do you remember the [`Properties`][properties] type on the [`Component`][component] trait? For a top
level component, as we already noted, this is unused and you should just set it to `()`. For a
subcomponent, though, you can make a struct type which contains named properties that the `gtk!`
macro will map your subcomponent tag's attributes onto. We'll see how that works in a moment.

A common pattern when making subcomponents that don't need their own internal state other than their
properties is to make the [`Component::Properties`][properties] type `Self`. That way, every bit of
state maps directly and automatically to a property, and there's no need to make two different
types, one for the component and one for its properties. We're going to use that pattern here for
our button bar subcomponent.

Let's add the struct for it:

```rust
#[derive(Clone, Debug, Default)]
pub struct Radio {
    pub labels: &'static [&'static str],
    pub active: usize,
}
```

It has two bits of state: a list of button labels, and a number indicating which button is active.

We also need a message type for it. We'll leave it empty for now.

```rust
#[derive(Clone, Debug)]
enum RadioMessage {}
```

Now, let's implement [`Component`][component] on it. It should be fairly straightforward, but
there's something new: because it's a subcomponent, we're going to need to implement
[`create`][component::create] and [`change`][component::change] in addition to the view and update
methods we've already seen. [`create`][component::create] is called when the subcomponent is first
constructed, and [`change`][component::change] when there are new properties coming down from the
parent. Luckily, because the properties type is the same as the component type itself, these are
very concise to implement.

```rust
impl Component for Radio {
    type Message = RadioMessage;
    type Properties = Self;

    fn create(props: Self) -> Self {
        props
    }

    fn change(&mut self, props: Self) -> UpdateAction<Self> {
        *self = props;
        UpdateAction::Render
    }

    fn view(&self) -> VNode<Self> {
        gtk! {
            <Box spacing=10>
                {
                    self.labels.iter().enumerate().map(|(index, label)| gtk! {
                        <ToggleButton label={ *label }
                                      active={ index == self.active } />
                    })
                }
            </Box>
        }
    }
}
```

We could have been smarter about the [`change`][component::change] method, which could return
`UpdateAction::None` if the new properties are identical to the current set, but let's leave that as
an exercise.

{% exercises "smarter-change-method" %}

-   Extend the `change()` method to check if the new properties are different from the current
    state, and only return `UpdateAction::Render` if they are.

{% endexercises %}

Looking at the view function, there's a new widget, [`ToggleButton`][togglebutton], which works just
like [`CheckButton`][checkbutton] except it's styled to look like a regular button, not a checkbox.
We iterate over the list of labels in our properties and make one [`ToggleButton`][togglebutton] for
each one, making sure the one with the same index as `self.active` is selected. We stuff all of
these in a horizontal [`Box`][box] with a little bit of padding between them. Nothing very new or
surprising here so far.

Now let's insert our new subcomponent into the top level component. In the view function for the top
level component (your `Model`), add a [`Box`][box] containing our subcomponent just after your
[`ScrolledWindow`][scrolledwindow] in your container box:

```rust
    ...
    </ScrolledWindow>
    <Box>
        <@Radio Box::center_widget=true active=0
                labels=["All","Active","Completed"].as_ref() />
    </Box>
</Box>
```

Note that, instead of just putting a `&` in front of that array to get us a reference to it, we use
`.as_ref()` instead, which gets around an unfortunate side effect of `vgtk`'s smart casting
mechanisms where Rust's type checker will complain at you that a reference to a sized array is
different from a reference to an array. It's worth remembering this trick for whenever you have a
component or widget which takes a `&[A]` for some `A` and you want to feed it an array literal.

Other than that, we note a peculiar difference in the tag syntax: There's a `@` in front of the
subcomponent name, to distinguish it from a GTK widget. Another thing to note about subcomponents is
that they cannot have children, so they're always given as single tags. They can also not have `on`
signal handlers attached, because signals are unique to GTK widgets. This means we're going to have
to find a different way to communicate with our subcomponents, but let's get back to that in a bit.

The `center_widget=true` property is also worth noting. If you've guessed this centres the
subcomponent inside the box, you're right, but we could have achieved the same effect with a
`Box::fill=true`. We're going to add a few widgets on either side of the subcomponent, though, and
if we relied on `fill` its position would be affected by the widths of those widgets.
`center_widget` is a special property on [`Box`][box] which takes the widget out of the normal
layout flow and always positions it in the exact centre of the box.

OK, let's try running that and see how it turns out.

{% gif "subcomponent.png" %}

There's no logic in the buttons, though, you can just toggle them all individually with no effect on
the list, and we're going to have to fix that.

### Communicating With A Subcomponent

We already noted that subcomponents don't have signal handlers, because they're not GTK widgets and
hence they don't actually have signals. `vgtk` provides a different mechanism to communicate between
components: [`Callback`][callback]s.

Let's add one to our subcomponent's model. First, we need to add a `use` declaration for it, because
the app template didn't already do it for us. Add it to the one that pulls in the other `vgtk` types
like this:

```rust
use vgtk::{gtk, run, Callback, Component, UpdateAction, VNode};
```

Then add a property to our subcomponent's model:

```rust
#[derive(Clone, Debug, Default)]
struct Radio {
    labels: &'static [&'static str],
    active: usize,
    on_changed: Callback<usize>,
}
```

The idea here is that whenever the user changes the selection on the subcomponent's radio buttons,
we trigger the `on_changed` callback with the index of the newly selected button (that's the
`usize`). In order to respond to the user changing the selection, though, we need the usual: a
signal handler and a message.

First, the message:

```rust
#[derive(Clone, Debug)]
enum RadioMessage {
    Changed(usize),
}
```

Then, the signal handler, in the subcomponent's view function:

```rust
fn view(&self) -> VNode<Self> {
    gtk! {
        <Box spacing=10>
            {
                self.labels.iter().enumerate().map(|(index, label)| gtk! {
                    <ToggleButton label={ *label }
                                    active={ index == self.active }
                                    on toggled=|_| RadioMessage::Changed(index) />
                })
            }
        </Box>
    }
}
```

And, finally, we need to add an update function to the subcomponent, responding to the message by
invoking the callback.

```rust
fn update(&mut self, msg: Self::Message) -> UpdateAction<Self> {
    match msg {
        RadioMessage::Changed(index) => {
            self.on_changed.send(index);
            UpdateAction::Render
        }
    }
}
```

The `UpdateAction::Render` is especially important in this case, because the current state of the
GTK widget tree will be that both the button you just toggled and the previously active button will
be selected. Triggering a re-render will make sure only the button you tell the subcomponent is the
active one is selected.

Speaking of which, the last thing we have to do to get this all working is to have our top level
component actually respond to that callback by updating its idea of which button is the active one.
Right now, we don't even track that, we just told the subcomponent that `active=0`, so we're going
to have to update our model a bit. We add the `filter` property to the `Model` struct, and to the
`Default` implementation, like this:

```rust
#[derive(Clone, Debug)]
struct Model {
    tasks: Vec<Task>,
    filter: usize,
}

impl Default for Model {
    fn default() -> Self {
        Self {
            tasks: vec![
                ...
            ],
            filter: 0,
        }
    }
}
```

Next, as is customary, we need a message to let us know the user has changed the filter:

```rust
#[derive(Clone, Debug)]
enum Message {
    ...
    Filter { filter: usize },
}
```

The update function needs a match clause to respond to our new message by updating the model:

```rust
fn update(&mut self, msg: Self::Message) -> UpdateAction<Self> {
    match msg {
        ...
        Message::Filter{filter} =>{
            self.filter = filter;
            UpdateAction::Render
        }
    }
}
```

And, finally, we need to attach a callback to our subcomponent to find out when the filter has been
changed. This is where the callback finally comes into play. Don't forget to also tell the
subcomponent about the new `filter` field in the model, via the `active` property!

```rust
<@Radio Box::center_widget=true active=self.filter
        labels=["All", "Active", "Completed"].as_ref()
        on changed=|filter| Message::Filter { filter } />
```

Now `cargo run` that and see how it turned out. Try clicking some of the filter buttons—you should
see that this time, only one of them will select at any one time, and it's the one tracked by our
model.

On the other hand, while the subcomponent now works the way it's supposed to, it doesn't actually
filter anything yet. We don't have to add anything more to our model to get there, though, we just
have to update the view function to take the filter into account when we build the list of tasks.

Let's first make a method on `Model` to filter the list for us:

```rust
impl Model {
    fn filter_task(&self, task: &Task) -> bool {
        match self.filter {
            // "All"
            0 => true,
            // "Active"
            1 => !task.done,
            // "Completed"
            2 => task.done,
            // index out of bounds
            _ => unreachable!(),
        }
    }
}
```

We'll use that method in our view function to filter the task list, by updating the iterator inside
our [`ListBox`][listbox] with a `filter()` call:

```rust
<ListBox selection_mode=SelectionMode::None>
    {
        self.tasks.iter().filter(|task| self.filter_task(task))
            .enumerate().map(|(index, task)| task.render(index))
    }
</ListBox>
```

Now try `cargo run` again—the list should now update to reflect the filters you choose.

{% gif "working-filter.png" %}

{% exercises "filter-enum" %}

-   The `filter_task()` method we just wrote isn't very nice. It would be much better if we could
    make the filter type an enum, rather than a `usize`, and better still if we could generalise the
    `Radio` subcomponent over that enum type, so that there's never a `usize` in sight. See how far
    you can get towards that goal. (The
    [TodoMVC example](https://github.com/bodil/vgtk/blob/master/examples/todomvc/src/radio.rs) in
    the `vgtk` git repo offers one solution, using the [`strum`](https://docs.rs/strum/) crate for
    maximum ease of use via some fancy derives.)

{% endexercises %}

## Nearly There

To be fully TodoMVC compliant, we need three more items: one, a label telling us how many tasks
remain to be done; two, a button which deletes all completed tasks; three, a button which toggles
all tasks.

First, the label. It's the easiest to add, because the user doesn't interact with it so we don't
need any messages. We can just add it to our view function directly. Let's render the label in
another helper method on our model, though:

```rust
impl Model {
    fn items_left(&self) -> String {
        let left = self.tasks.iter().filter(|task| !task.done).count();
        let plural = if left == 1 { "item" } else { "items" };
        format!("{} {} left", left, plural)
    }

    ...
}
```

Try running that, and verify that the number updates as you select and deselect tasks.

Notice also how the `center_widget` property from earlier is paying off: the label changes width a
lot as you select and deselect tasks, but the filter widget stays in the exact same position
throughout.

{% gif "very-informative-label.png" %}

Next, we want that button we can click to immediately clear out all completed tasks from our list.
This button should not be present if there are no completed tasks to clear out. We can do this using
the same kind of code block as when we created the task list itself by using an iterator, but in
this case it's either one item or zero, not a whole list of things.

Let's first make a helper method in order to keep the view function tidy:

```rust
impl Model {
    fn count_completed(&self) -> usize {
        self.tasks.iter().filter(|task| task.done).count()
    }

    ...
}
```

Next, we need, as always, a new message:

```rust
#[derive(Clone, Debug)]
enum Message {
    ...
    Cleanup,
}
```

A corresponding update function update is, as always, also needed:

```rust
    fn update(&mut self, msg: Self::Message) -> UpdateAction<Self> {
        match msg {
            ...
            Message::Cleanup => {
                self.tasks.retain(|task| !task.done);
                UpdateAction::Render
            }
        }
    }
```

And now we can add the button to our view function—or not add it, as the case may be. We need the
[`gtk_if!`][gtk_if] macro for this, which we don't have in scope yet, so you'll need to update your
`use` statement again:

```rust
use vgtk::{gtk, gtk_if, run, Callback, Component, UpdateAction, VNode};
```

In the view function, we add this block to the bottom [`Box`][box] just after the radio
subcomponent.

```rust
<Box>
    <Label label=self.items_left() />
    <@Radio Box::center_widget=true active=self.filter
            labels=["All", "Active", "Completed"].as_ref()
            on changed=|filter| Message::Filter { filter } />
    {
        gtk_if!(self.count_completed() > 0 => {
            <Button label="Clear completed" Box::pack_type=PackType::End
                    on clicked=|_| Message::Cleanup />
        })
    }
</Box>
```

The [`gtk_if!`][gtk_if] macro takes a conditional expression and a widget tag, and only inserts the
widget if the expression is true.

Note also the `Box::pack_type=PackType::End` property. This causes the widget to be inserted on the
right side of the box, instead of on the left just after the label. Remember the radio button bar
has the `center_widget=true` property, so it always appears in the middle, and anything without an
explicit `Box::pack_type=PackType::End` goes to the left of it.

Behold! the button:

{% gif "cleanup-button.png" %}

The best part? When you click it, it will disappear. Tick off another task, and it's back. This
right here is what programming is all about.

We're just missing one thing now to be fully TodoMVC compliant, but it's not terribly exciting so
we'll leave it as an exercise.

{% exercises "toggle-all-button" %}

-   There's one item left to get to a complete standards compliant TodoMVC app: a button to the left
    of the input box which lets you toggle all your tasks in one go. It should work like this: if
    all your tasks are currently done, it should set them all to not done. If any task is set to not
    done, it should set them all to done. See if you can implement this button.

{% endexercises %}

## Making A Menu

One thing TodoMVC traditionally doesn't have, but that every self respecting desktop application
should, is a menu bar. It's not that this app would particularly benefit from one, it's just that
making a menu bar with `vgtk` isn't very straightforward and it'll be good to see how it's supposed
to be done. Making a menu bar with GTK isn't really that straightforward in the first place, so the
more examples, the merrier.

We're not going to go overboard with this, though. Let's just add a simple hamburger menu to the
window with two menu items on it: "About" and "Quit." As an added bonus, this means we're also going
to get to see how to display a modal dialog.

### Oh Why Is GTK So Weird

But first! Let me tell you about GTK widget trees. If you've done web development, you might think
the DOM is unnecessarily complicated. It's not, really, at least not in its structure: it's a
regular tree structure, where each element has a list of children and that's the only way DOM
elements nest.

GTK, on the other hand... you'd think, well, every GTK element which can have children implements
[`Container`][container], and that provides a clear API for how widgets nest. This is partially
true, in that most widgets that can have children implement [`Container`][container] and its API
works for that, even if it's not entirely clear. But some widgets can have children added in other
ways, quite outside of the [`Container`][container] API—you've already seen one of them, in the
`Box::center_widget` property. What goes on there, under the hood, is that [`Box`][box] has a
special method, [`set_center_widget()`][set_center_widget], which adds a widget into a special
position, and it's outside of the [`Container`][container] API. This is just one of many exceptions
you'll encounter when using GTK widgets. Its API is definitely showing signs of the age of the
toolkit—it's a good quarter century old by now, and it's designed for a language, C, that's almost
another quarter century older than that again. (That said, it's still one of only a very small
handful of cross platform GUI toolkits that are actually mature enough for general use, and whose
aesthetic has evolved with the times instead of still looking like it did in the 90s.)

The reason I mention this (other than to generally vent about how hard it was to write a virtual
widget tree differ because of this) is that we're about to see another special case:
[`Window::set_titlebar`][set_titlebar]. GTK windows allow you to provide a custom title bar instead
of the system default, and it comes ready made with one type of custom title bar (in heavy use in
[GNOME] apps) that lets us add that hamburger menu in a convenient spot right next to the window
controls.

The `vgtk` widget tree model tries its best to incorporate all those unfortunate special cases of
adding child widgets found in GTK. There's a special hack for `center_widget` in `vgtk::ext`, but
generally, when a container widget has weird APIs, `vgtk` just adds rules about what kind of
children, and how many, it can take, and it figures out how to add them based on these factors.
[`Window`][window] takes either one or two children. If one, it's the window's contents, but you can
also give it two children. If you do, `vgtk` will take the second one as the window's contents, and
add the first one with [`set_titlebar`][set_titlebar].

### Title Bar Time

So let's try adding a custom title bar. There's one in GTK already that's exactly what we want:
[`HeaderBar`][headerbar]. We'll just go ahead and add it to our window:

```rust
<Window default_width=800 default_height=600
        border_width=20 on destroy=|_| Message::Exit>
    <HeaderBar title="Erlang: The Todo List" show_close_button=true />
    <Box orientation=Orientation::Vertical spacing=10>
        ...
    </Box>
</Window>
```

Let's run it and see what it looks like.

{% gif "custom-title-bar.png" %}

See the difference? It's a little larger now, and we have a custom title, but it's designed to blend
in.

The big difference, though, is that we can add child widgets to it. But before we get as far as
adding the menu button, we'll need to build the menu bar to attach to it. And to do _that,_ first we
need some [`Action`][action]s to put in it.

### Actions

[`Action`][action]s are predefined actions the user can trigger, at the application or window level.
They're meant as an abstraction that can be represented in many different ways, including in the
application's [D-Bus] interface if you're on a system that supports it, but most obviously as menu
items and keyboard shortcuts.

We can declare [`Action`][action]s with the `gtk!` macro, either as children of the top level
application or as children of a window, but we'd have to swap our [`Window`][window] for an
[`ApplicationWindow`][applicationwindow] in order to be able to attach actions to it. We're not
going to bother, though, as the only two actions we want work fine at the application level.

The difference between application level actions and window level actions is that the latter affect
only the active window, assuming your app can have more than one window open, while application
level actions would affect every window in the app. In our case, the "about" action opens an about
dialog independent of any other windows, and the "quit" action quits the entire app, windows along
with it. There's also the thing where we only have a single window anyway, but it's good to
understand the difference.

Let's add these two actions to our application. Where do we start? Messages, of course. We already
have a suitable message for the "quit" action, `Message::Exit`, but we'll need a new one for the
"about" action.

```rust
#[derive(Clone, Debug)]
enum Message {
    Exit,
    About,
    ...
}
```

We'll need to handle it in the update function, or the app won't even compile, but let's just have
it do nothing for now. We're going to circle back later and add a proper dialog once we've got the
menu up and running.

```rust
fn update(&mut self, msg: Self::Message) -> UpdateAction<Self> {
    match msg {
        ...
        Message::About => UpdateAction::None,
    }
}
```

Now we can add our two actions to the view function:

```rust
fn view(&self) -> VNode<Model> {
    gtk! {
        <Application::new_unwrap(Some("com.example.vgtk-tutorial"), ApplicationFlags::empty())>
            <SimpleAction::new("quit", None) Application::accels=["<Ctrl>q"].as_ref() enabled=true
                    on activate=|a, _| Message::Exit/>
            <SimpleAction::new("about", None) enabled=true on activate=|_, _| Message::About />

            <Window default_width=800 default_height=600
                    border_width=20 on destroy=|_| Message::Exit>
                ...
            </Window>
        </Application>
    }
}
```

Notice that we add them as direct children of the application, alongside the [`Window`][window].
Notice, also, that we need to use the [`SimpleAction::new`][simpleaction::new] constructor to make a
[`SimpleAction`][simpleaction]. [`Action`][action]s aren't GTK widgets, they live in [GIO], which is
a lower level component of the GTK stack than GTK itself. As a consequence of this, they can't be
built using GTK's [`Buildable`][buildable] API like the rest of our widgets, hence the constructor.
They are [GLib] objects, though, so they still have signals and properties. We're using one of each:
an action must have `enabled=true` for the user to be able to trigger it, and we listen to the
`activate` signal to find out when it's been triggered.

There's also a child property worth noting on the first action:
[`Application::accels`][set_child_accels]. It takes a list of keyboard shortcut descriptions, and
lets you trigger the action using them. In our case, `<Ctrl>q` should be a way to trigger the "quit"
action and exit the application.

Let's try that straight away. We have a slight problem first, though, because
[`SimpleAction`][simpleaction] isn't in scope. We're going to have to extend our use statement for
`vgtk::lib::gio` like this:

```rust
use vgtk::lib::gio::{ActionExt, ApplicationFlags, SimpleAction};
```

It should compile now, so go ahead and `cargo run` it and see if you can use `<Ctrl>q` as a keyboard
command to exit the application.

Did it work? It did, didn't it? This is so exciting.

### Building The Menu

Now let's take these actions and make a menu out of them. There's no macro for building a menu (at
least not yet), but there's a pretty straightforward [builder][vgtk::menu] for them. Let's try it
out by building a menu inside our view function, just before the `gtk!` macro.

A menu can contain any number of _sections_ and _items_. An item is the thing you pick from the
menu, and it's made from a label and the name of the action it triggers. A section is a way to group
items inside a menu: GTK will render visual separators between sections. These separators can be
just whitespace, depending on your widget theme, but they're always shown as visually distinct parts
of the menu. In other words, if you want a separator between two menu items, you put them in two
different sections.

Let's make ours:

```rust
fn view(&self) -> VNode<Model> {
    let main_menu = vgtk::menu()
        .section(vgtk::menu().item("About...", "app.about"))
        .section(vgtk::menu().item("Quit", "app.quit"))
        .build();

    gtk! {
        ...
    }
}
```

Notice the name of the action: it takes a prefix telling GTK where to find it. Ours are both
application level actions, because they're both attached to our [`Application`][application] object,
so their prefix is `app.`. The prefix for window level actions is `win.`, but we're not using that
anywhere today.

The builder leaves us with a [`MenuModel`][menumodel] from which we can build a [`Menu`][menu] for
any widget which will take it. GTK has a [`MenuButton`][menubutton] widget for making menu dropdown
buttons, and it can be added directly to our [`HeaderBar`][headerbar] to make it appear alongside
the standard buttons on the window frame. So let's turn our [`HeaderBar`][headerbar] into a parent
and add that [`MenuButton`][menubutton]:

```rust
<HeaderBar title="Erlang: The Todo List" show_close_button=true>
    <MenuButton HeaderBar::pack_type=PackType::End @MenuButtonExt::direction=ArrowType::Down
                relief=ReliefStyle::None image="open-menu-symbolic">
        <Menu::new_from_model(&main_menu)/>
    </MenuButton>
</HeaderBar>
```

Note a few things here. We use our old friend `pack_type=PackType::End` again so that the button
gets added on the right hand side of the header bar, just next to the window controls. We tell it
not to draw a button border with `relief=ReliefStyle::None`, and we tell it to use the hamburger
menu icon with `image="open-menu-symbolic"`.

And there's a bit of new syntax here too. A menu button has a property `direction` which describes
where the menu is going to pop up in relation to the button, which we want to set to
`ArrowType::Down`. But there's a problem, because there's also a `direction` property on
[`Widget`][widget] which is about something else entirely (text direction). We therefore have to
tell the `gtk!` macro which `direction` we need, using the `@Type::property` syntax. The relevant
getter and setter methods come from the [`MenuButtonExt`][menubuttonext] trait, so that's the type
we need to give it.

OK, let's `cargo run` and try this out.

{% gif "dropdown-menu.png" %}

That's our menu! Look, the "quit" item even has the keyboard shortcut printed on it. You should be
able to exit the app using that menu item now.

## Let's Sit Down And Have A Dialog

The "about" menu item doesn't work yet, though, because it's sending the `Message::About` message
and we're just ignoring it. I think it's time we made ourselves an about dialog.

In fact, we've come so far already, I think it's time we treat ourselves. Let's make an about dialog
with a _dog_ in it.

Here is a dog.

<a href="dog.png">{% gif "dog.png" %}</a>

Save this very good dog as `dog.png` in your project's `src` folder, alongside your `main.rs` file.
Rust has an [`include_bytes!`][include_bytes!] macro which we can use to embed the dog directly into
our binary, and GTK has facilities for parsing the PNG file into something it can render into a
window.

First, the dog. Put this anywhere at the top level of your code, but I prefer it in pride of place
just beneath the use statements.

```rust
static DOG: &[u8] = include_bytes!("dog.png");
```

Now, the dialog. We're going to implement this as a separate component, and it follows the exact
same pattern as any of your other components. It needs a struct for state, a `Default`
implementation, and a [`Component`][component] implementation.

The only state we need is the dog, and it's not going to change after we've first created it, so
there's no need for a message type.

```rust
pub struct AboutDialog {
    dog: Pixbuf,
}
```

You're going to need to pull that [`Pixbuf`][pixbuf] into scope, along with a few more things we're
going to need to construct it. Find your `use vgtk::lib::gio::...` statement and replace it with
this:

```rust
use vgtk::lib::gdk_pixbuf::Pixbuf;
use vgtk::lib::gio::{ActionExt, ApplicationFlags, Cancellable, MemoryInputStream, SimpleAction};
use vgtk::lib::glib::Bytes;
```

That pulls in the [`Pixbuf`][pixbuf] and everything we need to turn the PNG into one (as well as the
things from `gio` we were already using).

We'll let the `Default` implementation do the work of parsing the PNG into a [`Pixbuf`][pixbuf]:

```rust
impl Default for AboutDialog {
    fn default() -> Self {
        let data_stream = MemoryInputStream::new_from_bytes(&Bytes::from_static(DOG));
        let dog = Pixbuf::new_from_stream(&data_stream, None as Option<&Cancellable>).unwrap();
        AboutDialog { dog }
    }
}
```

And now the [`Component`][component] implementation. It doesn't have any messages, and we're not
going to embed it as a subcomponent, so the only method it needs to implement is `view()`. Its top
level widget should be a [`Dialog`][dialog] or something which implements it. We're fine with
regular [`Dialog`][dialog] here.

```rust
impl Component for AboutDialog {
    type Message = ();
    type Properties = ();

    fn view(&self) -> VNode<Self> {
        gtk! {
            <Dialog::new_with_buttons(
                Some("About The Todo List"),
                None as Option<&Window>,
                DialogFlags::MODAL,
                &[("Ok", ResponseType::Ok)]
            )>
                <Box spacing=10 orientation=Orientation::Vertical>
                    <Image pixbuf=Some(self.dog.clone())/>
                    <Label markup="<big><b>A Very Nice Todo List</b></big>"/>
                    <Label markup="made with <a href=\"http://vgtk.rs/\">vgtk</a> by me"/>
                </Box>
            </Dialog>
        }
    }
}
```

Let's take a look at this. First, we're using the [`new_with_buttons`][new_with_buttons] constructor
to build a dialog with pre-made dialog buttons. We're asking it for just the one: an "Ok" button.
We're also telling it this should be a modal dialog, which means it'll block the rest of the
application until you either hit that "Ok" button or close its window. It takes a single content
widget, just like a [`Window`][window], and inside that we put our noble beast as an
[`Image`][image] widget, along with some text labels. GTK is going to handle the button interaction
for us, so that's all we need here.

Let's add a method to run the dialog.

```rust
impl AboutDialog {
    #[allow(unused_must_use)]
    fn run() {
        vgtk::run_dialog::<AboutDialog>(vgtk::current_window().as_ref());
    }
}
```

Wait, `#[allow(unused_must_use)]`? What's that about?

[`vgtk::run_dialog`][run_dialog] returns a [`Future`][future] which you can use if you need to wait
for the user to respond to the dialog. We don't really care about this, though, so we just ignore
the future. The dialog is still going to run. `rustc`, however, really doesn't like you ignoring
futures, though, so it's going to flag this as a warning. We tell it to `#[allow(unused_must_use)]`
explicitly so it'll stop complaining. Or you could just ignore the warning, but if you're anything
like me, ignored compiler warnings will keep you up at night.

Note, also, that [`vgtk::run_dialog`][run_dialog] takes a parent window as an argument, to which it
attaches the dialog, if that's meaningful on your choice of desktop environment. In order to get
this, `vgtk` provides the [`current_window()`][current_window] function, which is usually the right
choice here.

Finally, let's tell our top level update function to stop quietly ignoring the `Message::About`
message and run the dialog instead.

```rust
fn update(&mut self, msg: Self::Message) -> UpdateAction<Self> {
    match msg {
        ...
        Message::About => {
            AboutDialog::run();
            UpdateAction::None
        }
    }
}
```

It's still responding with `UpdateAction::None`, because running the dialog doesn't make the main
window have to re-render itself, but now it's launching the dialog first.

So let's `cargo run` this and try it out!

{% gif "dog-dialog.png" %}

_Look at that amazing dog dialog!_

We're never going to top this, so let's stop there, and be content with our labours.

If you're not ready to give up yet, there are some exercises below that you can try. You can also go
back through the text and try the exercises scattered throughout, if you skipped them. You'll need
to prepare yourself for getting used to reading GTK documentation, though, it's not always a task
for the faint of heart.

I hope you've enjoyed this tutorial (and the dog, most of all), and good luck building your next big
GTK app.

If you find anything missing (and there's bound to be a lot missing yet), you can
[file an issue](https://github.com/bodil/vgtk/issues) or, even better,
[submit a pull request](https://github.com/bodil/vgtk/pulls).

As a final bonus for getting this far, if you've noticed the other dog lurking behind the
application window, and you really want her as your desktop wallpaper too, it is
[here](follow-your-dreams.jpg), and it's an unlimited fount of inspiration.

{% exercises "exercises" %}

-   So far, we've used a hardcoded list of tasks, discarding any edits on exit, which is a bit silly
    for a real app. Design a storage format for todo lists (or see if there's a standard format out
    there already) and implement load/save functionality so the app can persist its state. You can
    use standard Rust I/O for this, but it would be even better to use [GIO] async I/O.
-   If you can load and save files, it makes sense to add the standard file menu items to our
    hamburger menu: "Open..." and "Save as..." and all that. You'll need to figure out GTK file
    dialogs as well as add some window level actions.
-   Once you have a way to open and save files, make the window title show the name of the current
    file. For extra credits, make it also show a little star `*` after the file when it's dirty.

{% endexercises %}

## Footnotes

{% define_footnote "1" %}

GTK properties aren't just defined by getters and setters, in reality: GTK objects actually keep a
list of which properties exist and what sort of values they should accept, with a full API for
manipulating them via string keys, which earlier iterations of `vgtk` took advantage of. The problem
with this approach is that the API is untyped, or, rather, relies on casting the provided value into
the expected value at runtime rather than at compile time. The reason for the current design is that
we can now check the property values at compile time and throw the appropriate type errors, rather
than have the application panic at runtime when you've made a boo-boo.

{% enddefine_footnote %}

[elm]: https://elm-lang.org/
[rust]: https://www.rust-lang.org/
[gtk]: https://www.gtk.org/
[vgtk]: http://vgtk.rs/
[react]: https://reactjs.org/
[yew]: https://github.com/yewstack/yew
[todomvc]: http://todomvc.com/
[component]: https://docs.rs/vgtk/latest/vgtk/trait.Component.html
[elm architecture]: https://guide.elm-lang.org/architecture/
[redux]: https://redux.js.org/
[jsx]: https://reactjs.org/docs/introducing-jsx.html
[glib]: https://en.wikipedia.org/wiki/GLib
[gio]: https://en.wikipedia.org/wiki/GIO_(software)
[async-std]: https://docs.rs/async-std/
[tokio]: https://docs.rs/tokio/
[gtk-rs]: https://gtk-rs.org/
[futures]: https://docs.rs/futures/
[qt]: https://www.qt.io/
[gnome]: https://www.gnome.org/
[d-bus]: https://www.freedesktop.org/wiki/Software/dbus/
[cargo-generate]: https://github.com/ashleygwilliams/cargo-generate
[cargo-template-vgtk]: https://github.com/bodil/cargo-template-vgtk
[application]: https://gtk-rs.org/docs/gtk/struct.Application.html
[window]: https://gtk-rs.org/docs/gtk/struct.Window.html
[label]: https://gtk-rs.org/docs/gtk/struct.Label.html
[new_unwrap]: https://docs.rs/vgtk/0.2.0/vgtk/ext/trait.ApplicationHelpers.html#method.new_unwrap
[application::new]: https://gtk-rs.org/docs/gtk/struct.Application.html#method.new
[unwrap]: https://doc.rust-lang.org/std/result/enum.Result.html#method.unwrap
[connect_destroy]: https://gtk-rs.org/docs/gtk/trait.WidgetExt.html#tymethod.connect_destroy
[vgtk::run]: https://docs.rs/vgtk/0.2.0/vgtk/fn.run.html
[log]: https://docs.rs/log/
[pretty_env_logger]: https://docs.rs/pretty_env_logger/
[gtkwidget.signals]: https://developer.gnome.org/gtk3/stable/GtkWidget.html#GtkWidget.signals
[get_label]: https://gtk-rs.org/docs/gtk/trait.LabelExt.html#tymethod.get_label
[set_label]: https://gtk-rs.org/docs/gtk/trait.LabelExt.html#tymethod.set_label
[vgtk::ext]: https://docs.rs/vgtk/0.2.0/vgtk/ext/index.html
[scrolledwindow]: https://gtk-rs.org/docs/gtk/struct.ScrolledWindow.html
[listbox]: https://gtk-rs.org/docs/gtk/struct.ListBox.html
[listboxrow]: https://gtk-rs.org/docs/gtk/struct.ListBoxRow.html
[box]: https://gtk-rs.org/docs/gtk/struct.Box.html
[checkbutton]: https://gtk-rs.org/docs/gtk/struct.CheckButton.html
[entry]: https://gtk-rs.org/docs/gtk/struct.Entry.html
[orientation]: https://gtk-rs.org/docs/gtk/enum.Orientation.html
[connect_activate]: https://gtk-rs.org/docs/gtk/trait.EntryExt.html#tymethod.connect_activate
[select_region]: https://gtk-rs.org/docs/gtk/trait.EditableExt.html#tymethod.select_region
[set_selection_mode]: https://gtk-rs.org/docs/gtk/trait.ListBoxExt.html#tymethod.set_selection_mode
[set_justify]: https://gtk-rs.org/docs/gtk/trait.LabelExt.html#tymethod.set_justify
[packtype]: https://gtk-rs.org/docs/gtk/enum.PackType.html
[set_relief]: https://gtk-rs.org/docs/gtk/trait.ButtonExt.html#tymethod.set_relief
[reliefstyle::none]: https://gtk-rs.org/docs/gtk/enum.ReliefStyle.html#variant.None
[properties]: https://docs.rs/vgtk/0.2.0/vgtk/trait.Component.html#associatedtype.Properties
[callback]: https://docs.rs/vgtk/0.2.0/vgtk/struct.Callback.html
[component::create]: https://docs.rs/vgtk/0.2.0/vgtk/trait.Component.html#method.create
[component::change]: https://docs.rs/vgtk/0.2.0/vgtk/trait.Component.html#method.change
[togglebutton]: https://gtk-rs.org/docs/gtk/struct.ToggleButton.html
[callback]: https://docs.rs/vgtk/0.2.0/vgtk/struct.Callback.html
[vnode::empty]: https://docs.rs/vgtk/0.2.0/vgtk/enum.VNode.html#method.empty
[into_iter]: https://doc.rust-lang.org/std/iter/trait.IntoIterator.html#tymethod.into_iter
[gtk_if]: https://docs.rs/vgtk/0.2.0/vgtk/macro.gtk_if.html
[container]: https://gtk-rs.org/docs/gtk/struct.Container.html
[set_center_widget]: https://gtk-rs.org/docs/gtk/trait.BoxExt.html#tymethod.set_center_widget
[set_titlebar]: https://gtk-rs.org/docs/gtk/trait.GtkWindowExt.html#tymethod.set_titlebar
[headerbar]: https://gtk-rs.org/docs/gtk/struct.HeaderBar.html
[action]: https://gtk-rs.org/docs/gio/struct.Action.html
[applicationwindow]: https://gtk-rs.org/docs/gtk/struct.ApplicationWindow.html
[simpleaction]: https://gtk-rs.org/docs/gio/struct.SimpleAction.html
[simpleaction::new]: https://gtk-rs.org/docs/gio/struct.SimpleAction.html#method.new
[set_child_accels]:
    https://docs.rs/vgtk/0.2.0/vgtk/ext/trait.ApplicationHelpers.html#method.set_child_accels
[vgtk::menu]: https://docs.rs/vgtk/0.2.0/vgtk/fn.menu.html
[menu]: https://gtk-rs.org/docs/gtk/struct.Menu.html
[menumodel]: https://gtk-rs.org/docs/gio/struct.MenuModel.html
[menubuttonext]: https://gtk-rs.org/docs/gtk/trait.MenuButtonExt.html
[widget]: https://gtk-rs.org/docs/gtk/struct.Widget.html
[menubutton]: https://gtk-rs.org/docs/gtk/struct.MenuButton.html
[include_bytes!]: https://doc.rust-lang.org/std/macro.include_bytes.html
[pixbuf]: https://gtk-rs.org/docs/gdk_pixbuf/struct.Pixbuf.html
[run_dialog]: https://docs.rs/vgtk/0.2.0/vgtk/fn.run_dialog.html
[current_window]: https://docs.rs/vgtk/0.2.0/vgtk/fn.current_window.html
[new_with_buttons]: https://gtk-rs.org/docs/gtk/struct.Dialog.html#method.new_with_buttons
[image]: https://gtk-rs.org/docs/gtk/struct.Image.html
[updateaction::none]: https://docs.rs/vgtk/0.2.0/vgtk/enum.UpdateAction.html#variant.None
[updateaction::render]: https://docs.rs/vgtk/0.2.0/vgtk/enum.UpdateAction.html#variant.Render
[vnode]: https://docs.rs/vgtk/0.2.0/vgtk/enum.VNode.html
[buildable]: https://gtk-rs.org/docs/gtk/struct.Buildable.html
[dialog]: https://gtk-rs.org/docs/gtk/struct.Dialog.html
[future]: https://doc.rust-lang.org/std/future/trait.Future.html
