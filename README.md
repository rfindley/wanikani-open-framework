# Wanikani Open Framework

Wanikani Open Framework ("`wkof`") is a user-created framework for rapidly developing web browser userscripts for use with the Japanese kanji learning site [wanikani.com](https://www.wanikani.com).

_[Disclaimer: This project is currently in early development, so changes are expected to occur frequently.  Script writers are encouraged to evaluate the API and provide feedback to help shape its usefulness to the developer community.]_

-----

# Table of Contents

* [Overview](#overview)
* [Installation](#installation)
* [Getting Started](#getting_started)
  - [wkof members](#wkof_members)
  - [Core script](#core)
* [Modules](#modules)
  - [ItemData](#item_data_module)
  - [Apiv2](#apiv2_module)
  - [Menu](#menu_module)
  - [Settings](#settings_module)

-----

# <a id="overview">Overview</a>

Wanikani Open Framework ("`wkof`") provides interfaces for:
* Simplifying and coordinating retrieval of site and user data from Wanikani's API.
* Registering additional external data sources, such as additional kanji and vocabulary.
* Adding custom functionality to Wanikani's site menu.
* Creating and automating Settings dialogs for use by userscripts.
* Caching arbitrary files and data for rapid storage and retrieval.

The framework is structured as follows:
* A core script that provides file/url loading and caching services, and an event and state communication interface.
* A set of modules, loaded and cached upon request, providing the bulk of the framework's features.

-----

# <a id="installation">Installation</a>

The core script must be installed in a script-hosting browser plugin, such as TamperMonkey.

1. Install your desired script host (such as TamperMonkey).  Your chosen script host must support the ability to specify the run-order of scripts.
2. Create a new empty script in TamperMonkey, and paste the contents of the Core.js file.<br>
_(Note: Eventually, the core script will be released on GreasyFork.org.  At that time, the installation instructions will change accordingly.)_
3. Configure the script to run before all other scripts so the framework will be ready to use when its client script begin running.

To verify installation:

1. Navigate to [wanikani.com](https://www.wanikani.com/), log in, and navigate to the Dashboard.
2. Open the Javascript console, type the following command and press enter.

```javascript
wkof
```

3. If the framework is properly installed, the console should list the currently-loaded components of the framework, similar to the result shown below.  If `wkof` is undefined, framework is not properly installed.

```javascript
{include: f, ready: f, load_file: f, load_css: f, load_script: f, ...}
```

-----

# <a id="getting_started">Getting Started</a>

Before diving into the various interfaces of the framework, take a moment to familiarize yourself with the architecture.

## <a id="wkof_members">`wkof` members</a>

While on the Wanikani Dashboard, run this command in the Javascript console:

```javascript
wkof
```

The `wkof` object should appear at the output of the command (if not, check your installation).
Expand the `wkof` object, and examine its contents:

![Basic wkof members](docs/images/wkof_members_basic.png)

The contents shown above come from the Core script, which we discuss in the next section.
Your console may show additional contents if any framework modules are loaded.

## <a id="core">Core script</a>

We can group these contents into the following categories:

File caching:
* **`file_cache`** - A sub-object for caching arbitrary files and data.

Module-loading:
* **`include()`** - A function for loading framework modules.
* **`ready()`** - A function for triggering a callback when a module is ready to use.

Resource-loading:
* **`load_file()`** - A function for loading any file type from a URL.
* **`load_script()`** - A function for loading a Javascript file, and installing it into the DOM.
* **`load_css()`** - A function for loading a CSS file, and installing it into the DOM.

State functions:
* **`get_state()`** - A function for getting the value of a state variable.
* **`set_state()`** - A function for setting the value of a state variable.
* **`wait_state()`** - A function for specifying a function to call when a state variable reaches a specific state.

Event functions:
* **`on()`** - A function for specifying a function to call when a specific event occurs.
* **`trigger()`** - A function for triggering an event.

In addition to the above core functions, each module (when loaded) will have its own sub-object.  These sub-objects are discussed in the corresponding module documentation.

-----

# <a id="modules">Modules</a>

-----

## <a id="item_data_module">ItemData module</a>

-----

## <a id="apiv2_module">Apiv2 module</a>

-----

## <a id="menu_module">Menu module</a>

-----

## <a id="settings_module">Settings module</a>

