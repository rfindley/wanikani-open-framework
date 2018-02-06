# Wanikani Open Framework

Wanikani Open Framework ("`wkof`") is a user-created framework for rapidly developing web browser userscripts for use with the Japanese kanji learning site [wanikani.com](https://www.wanikani.com).

_[Disclaimer: This project is currently in early development, so changes are expected to occur frequently.  Script writers are encouraged to evaluate the API and provide feedback to help shape its usefulness to the developer community.]_

-----

# Table of Contents

* [Overview](#overview)
* [Installation](#installation)
* [Getting Started](#getting_started)
* [Reference](#reference)
  - [Core](#core_module)
    - [`file_cache`](#file_cache)
      - [`dir {}`](#file_cache_dir)
      - [`save()`](#file_cache_save)
      - [`load()`](#file_cache_load)
      - [`delete()`](#file_cache_delete)
      - [`clear()`](#file_cache_clear)
    - [`Loading external files`](#loading_files)
      - [`load_file()`](#load_file)
      - [`load_script()`](#load_script)
      - [`load_css()`](#load_css)
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

3. If the framework is properly installed, the console should list the currently-loaded components of the framework, similar to the result shown below.  If `wkof` is undefined, the framework is not properly installed.

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

# <a id="reference">Reference</a>
-----

## <a id="core_module">Core</a>

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

### <a id="file_cache">File Cache</a>

The `file_cache` object allows you to save and load files or arbitrary objects in indexedDB, the largest-capacity client-side storage interface available to the web page (typically 50MB).

The members of the `file_cache` object are:
* **`dir`** - A sub-object containing a list of all contents stored in the cache.
* **`save()`** - A function for saving a file or object into cache.
* **`load()`** - A function for loading a file or object from cache.
* **`delete()`** - A function for deleting a file, or all files matching a regex pattern, from cache.
* **`clear()`** - A function for clearing all contents from cache.

-----

### <a id="file_cache_dir">`wkof.file_cache.dir`</a>

Example **`dir`** object format:
```javascript
{
    "filename1": {added: "2/6/2018, 3:57:23 PM", last_loaded: "2/6/2018, 3:57:23 PM"}
    "filename2": {added: "2/6/2018, 3:57:21 PM", last_loaded: "2/6/2018, 3:57:21 PM"}
}
```

-----

### <a id="file_cache_save">`wkof.file_cache.save(name, content)`</a>

Saves a file into `file_cache`.

#### _Parameters:_
* **`name`** - Name under which the content will be saved in cache.  Can be any string, including a URL.
* **`content`** - The content to save.  Can be a string or object.

#### _Return value:_
* **`Promise`** - A Promise that resolves when save is complete.

#### _Example:_
```javascript
// Create some data to store in cache.
var timeline_settings = {graph_height: 100, time_format: "24hour"};

// Save the data to cache.
wkof.file_cache.save('timeline_settings', timeline_settings)
.then(function(){
    console.log('Save complete!');
});

// Output
> Save complete!
```

-----

### <a id="file_cache_load">`wkof.file_cache.load(name)`</a>

Loads a file from `file_cache`.

#### _Parameters:_
* **`name`** - Name under which the content will be saved in cache.  Can be any string, including a URL.
* **`content`** - The content to save.  Can be a string or object.

#### _Return value:_
* **`Promise`** - A Promise that resolves with loaded data.

#### _Example:_
```javascript
// Retrieve the data.
wkof.file_cache.load('timeline_settings')
.then(function(settings) {
    // 'settings' contains {graph_height: 100, time_format: "24hour"}
    console.log('Timeline graph height is: ' + settings.graph_height);
});

// Output
> Timeline graph height is: 100
```

-----

### <a id="file_cache_delete">`wkof.file_cache.delete(name | regex)`</a>

Deletes one or more files from `file_cache`, using either the filename or a Regex pattern.

#### _Parameters:_
* **`name`** - Name of file to delete.
* **`regex`** - A Regex pattern matching the files to be deleted.

#### _Return value:_
* **`Promise`** - A Promise that resolves when the file or files are deleted.

#### _Example:_
```javascript
// Delete a file by specifying the full name.
wkof.file_cache.delete('timeline_settings');

// Delete a set of files matching a pattern (e.g. all files starting with "timeline_").
wkof.file_cache.delete(/^timeline_/);
```

-----

### <a id="file_cache_clear">`wkof.file_cache.clear()`</a>

Clears the `file_cache`.

#### _Parameters:_
* none

#### _Return value:_
* **`Promise`** - A Promise that resolves when the cache is clear.

#### _Example:_
```javascript
// Clear the file_cache contents.
wkof.file_cache.clear();
```

-----

## <a id="loading_files">Loading External Files</a>

We have three functions for loading files from an external URL:
* **`load_file()`** - Loads any file type from a URL, .
* **`load_script()`** - A function for loading a Javascript file, and installing it into the DOM.
* **`load_css()`** - A function for loading a CSS file, and installing it into the DOM.

-----

### <a id="load_file">`wkof.load_file(url [, use_cache])`</a>

Loads a file from a URL.

#### _Parameters:_
* **`url`** - URL of file to load.
* **`use_cache`** - (optional) If `true`, try loading from cache, and store a copy if fetched (default: false).

#### _Return value:_
* **`Promise`** - A Promise that resolves with the contents at the specified URL.

#### _Example:_
```javascript
// Load the user's account page, and retrieve their APIv2 key.
wkof.load_file('https://www.wanikani.com/settings/account', false /* use_cache */)
.then(function(html_string){
    // Convert the HTML string to DOM using jQuery
    var doc = $(html_string);

    // Extract the API key
    var apiv2_key = doc.find('#user_api_key_v2').val();
    console.log('apiv2_key = '+apiv2_key);
});
```

-----

### <a id="load_script">`wkof.load_script(url [, use_cache])`</a>

Loads a script file from a URL, and installs it into the page.

#### Parameters:
* **`url`** - URL of script file to load.
* **`use_cache`** - (optional) If `true`, try loading from cache, and store a copy if fetched (default: false).

#### Return value:
* **`Promise`** - A Promise that resolves when the script is successfully installed.

#### _Example:_
```javascript
// Load the user's account page, and retrieve their APIv2 key.
wkof.load_script('https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js', true /* use_cache */)
.then(function(html_string){
    console.log('jQuery UI script loaded!');
});
```

-----

### <a id="load_css">`wkof.load_css(url [, use_cache])`</a>

Loads a CSS file from a URL, and installs it into the page.

#### Parameters:
* **`url`** - URL of CSS file to load.
* **`use_cache`** - (optional) If `true`, try loading from cache, and store a copy if fetched (default: false).

#### Return value:
* **`Promise`** - A Promise that resolves when the CSS is successfully installed.

#### _Example:_
```javascript
// Load the user's account page, and retrieve their APIv2 key.
wkof.load_css('https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css', true /* use_cache */)
.then(function(html_string){
    console.log('jQuery UI theme loaded!');
});
```

-----

## <a id="item_data_module">ItemData module</a>

-----

## <a id="apiv2_module">Apiv2 module</a>

-----

## <a id="menu_module">Menu module</a>

-----

## <a id="settings_module">Settings module</a>

