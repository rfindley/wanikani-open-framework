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
    - [Loading external files](#loading_files)
      - [`load_file()`](#load_file)
      - [`load_script()`](#load_script)
      - [`load_css()`](#load_css)
  - [ItemData](#item_data_module)
    - [`get_items()`](#itemdata_get_items)
      - [Using a configuration object](#get_items_config)
        - [Options](#get_items_options)
        - [Filters](#get_items_filters)
        - [Inverting Filters](#get_items_invert)
    - [`get_index()`](#itemdata_get_index)
  - [Apiv2](#apiv2_module)
    - [`fetch_endpoint()`](#apiv2_fetch_endpoint)
    - [`get_endpoint()`](#apiv2_get_endpoint)
    - [`clear_cache()`](#apiv2_clear_cache)
    - [`is_valid_apikey_format()`](#apiv2_is_valid_apikey_format)
  - [Menu](#menu_module)
    - [`insert_script_link()`](#menu_insert_script_link)
  - [Progress](#progress_module)
    - [`update()`](#progress_update)
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

> **_[Note: While the framework is still in prototype, you can update the modules by deleting them from `file_cache` via a pattern-match for 'github' URLs:_**
>
> ```javascript
> wkof.file_cache.delete(/github/);
> ```

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

-----

# <a id="reference">Reference</a>

## <a id="core_module">Core</a>

The core module provides an interface for:
* Loading other modules
* Loading scripts, stylesheets, or any arbitrary file
* Loading and saving files or objects to cache
* Setting and waiting on state variables
* Sending and listening for events

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

An object containing a list of files stored in `file_cache`.

#### _Example:_
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

// Output:  Save complete!
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

// Output:  Timeline graph height is: 100
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

There are three functions for loading files from an external URL:
* **`load_file()`** - Loads any file type from a URL, .
* **`load_script()`** - Loads a Javascript file, and installing it into the DOM.
* **`load_css()`** - Loads a CSS file, and installing it into the DOM.

-----

### <a id="load_file">`wkof.load_file(url [, use_cache])`</a>

Loads a file from a URL.

#### _Parameters:_
* **`url`** - URL of file to load.
* **`use_cache`** - _(optional)_ If `true`, try loading from cache, and store a copy if fetched (default: false).

#### _Return value:_
* **`Promise`** - A Promise that resolves with the contents at the specified URL.

#### _Example: Retrieve the user's APIv2 key from their account page_
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
* **`use_cache`** - _(optional)_ If `true`, try loading from cache, and store a copy if fetched (default: false).

#### Return value:
* **`Promise`** - A Promise that resolves when the script is successfully installed.

#### _Example: Load jQuery UI and theme_
```javascript
// URLs for jQuery UI library and theme
var script = 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js';
var css = 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css';

// Instead of using `.then()` on each fetch, we will group them with a Promise.all()
var promises = [];
promises[0] = wkof.load_script(script, true /* use_cache */);
promises[1] = wkof.load_css(css, true /* use_cache */);

// Wait until all files are loaded, then do something
Promise.all(promises).then(do_something);

// This function is called when all the files requested above are loaded.
function do_something() {
    // TODO: Do something that makes use of jQuery UI
    console.log('jQuery UI script loaded!');
};
```

-----

### <a id="load_css">`wkof.load_css(url [, use_cache])`</a>

Loads a CSS file from a URL, and installs it into the page.

#### Parameters:
* **`url`** - URL of CSS file to load.
* **`use_cache`** - _(optional)_ If `true`, try loading from cache, and store a copy if fetched (default: false).

#### Return value:
* **`Promise`** - A Promise that resolves when the CSS is successfully installed.

#### _Example: Load jQuery UI and theme_
```javascript
// URLs for jQuery UI library and theme
var script = 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js';
var css = 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css';

// Instead of using `.then()` on each fetch, we will group them with a Promise.all()
var promises = [];
promises[0] = wkof.load_script(script, true /* use_cache */);
promises[1] = wkof.load_css(css, true /* use_cache */);

// Wait until all files are loaded, then do something
Promise.all(promises).then(do_something);

// This function is called when all the files requested above are loaded.
function do_something() {
    // TODO: Do something that makes use of jQuery UI
    console.log('jQuery UI script loaded!');
};
```

-----

## <a id="item_data_module">ItemData module</a>

The `ItemData` module:
* Provides an interface for fetching and caching item data.
* Cross-links the following Wanikani API endpoint data:
  - `/subjects`
  - `/assignments`
  - `/review_statistics`
  - `/study_materials`
* Provides a set of filters for selecting subsets of item data by various criteria.
* Allows client scripts to register additional data sources (such as an external set of Core10k vocabulary).
* Allows client scripts to register additional filters for selecting items (such as by leech score).
* Provides a global 'Loading...' progress bar when fetching data.

Internally, the module also:
* Coordinates requests from all client scripts to prevent redundant requests to the Wanikani API.
* Reduces browser memory consumption by sharing item objects across all scripts.
* Retrieves only the data requested by the user's active client scripts.

To use the `ItemData` module, you must include it from your script, and wait until the module is ready before accessing it:

```javascript
wkof.include('ItemData');
wkof.ready('ItemData').then(do_something);

function do_something() {
    // TODO:  Add your code to access the ItemData interface.
    console.log('wkof.ItemData is loaded');
}
```

-----

### <a id="itemdata_get_items">`wkof.ItemData.get_items([config])`</a>

Retrieves a set of items, applies filters to select a subset of those items, and returns an array of the resulting items.  These items can then be indexed by specific fields using the `get_index()` function.

#### Parameters:
* **`config`** - _(optional)_ A string or object that specifies the data sources and filters to be used in fetching the desired items.  (Described in detail <a href="#get_items_config">below</a>).

#### Return value:
* **`Promise`** - A Promise that resolves with the selected items.

#### _Example 1: Fetch items using default configuration (`/subjects` endpoint only)_
```javascript
// Include the ItemData module, and wait for it to be ready.
wkof.include('ItemData');
wkof.ready('ItemData').then(fetch_items);

// This function is called when the ItemData module is ready to use.
function fetch_items() {
    // No 'config' parameter, so we retrieve only the Wanikani /subjects endpoint.
    wkof.ItemData.get_items()
    .then(process_items);
}

function process_items(items) {
    // TODO: Do something with the items we retrieved.
    console.log('Retrieved ' + items.length + ' items.');
}

// Output:  Retrieved 8792 items.
```

#### _Example 2: Fetch items using comma-delimited list of endpoints_
```javascript
// Include the ItemData module, and wait for it to be ready.
wkof.include('ItemData');
wkof.ready('ItemData').then(fetch_items);

// This function is called when the ItemData module is ready to use.
function fetch_items() {
    // Retrieve only the /subjects and /assignments endpoints.
    var config = 'subjects, assignments';

    wkof.ItemData.get_items(config)
    .then(process_items);
}

function process_items(items) {
    // TODO: Do something with the items we retrieved.
    console.log('Retrieved ' + items.length + ' items.');
}

// Output:  Retrieved 8792 items.
```

### <a id="get_items_config">Using a configuration object with `wkof.ItemData.get_items()`</a>

The configuration object can be complex, depending on the desired configuration.  At the top level, it contains a list of data sources that `get_items()` will retrieve from.

```javascript
var config = {
    example_source1: {...},
    example_source2: {...}
};
```

Available sources are found in `wkof.ItemData.registry.sources`.  The only source defined by the Open Framework itself is `wk_items`, which represents the Wanikani API.  Client scripts can define additional data sources by adding a source definition to the registry.

```javascript
var config = {
    wk_items: {...}
};
```

Each source can have an `options` sub-object and a `filters` sub-object.  These are described in detail below.

```javascript
var config = {
    wk_items: {
        options: {...},
        filters: {...}
    }
};
```

#### <a id="get_items_options">Options</a>

The `options` sub-object allows you to set non-default values when configuring a source.  The available options are found in `wkof.ItemData.registry.sources.<source_name>.options`.

For `wk_items`, the following options are available:
* **`assignments`** - If `true`, add info from the `/assignments` endpoint to each item.  (Default is `false`).
* **`review_statistics`** - If `true`, add info from the `/review_statistics` endpoint to each item.  (Default is `false`).
* **`study_materials`** - If `true`, add info from the `/study_materials` endpoint to each item.  (Default is `false`).

For example, the following configuration will fetch the `/subjects`, `/assignments`, and `/review_statistics` endpoints. (Note: The `/subjects` endpoint will always be fetched, since all other endpoints reference the subject data).

```javascript
var config = {
    wk_items: {
        options: {
            assignments: true,
            review_statistics: true
        }
    }
};
```

#### <a id="get_items_filters">Filters</a>

The `filters` sub-object allows you to add criteria for narrowing down the list of items returned by `get_items()`.  For example, you can filter by Wanikani level, SRS level, etc.  If no filters are specified in the config, all retrieved items will be returned.

The available filters are found in `wkof.ItemData.registry.sources.<source_name>.filters`.

For `wk_items`, the following filters are currently available:
* **`item_type`** - An array or comma-delimited string specifying the item types to return.  Supported values are `rad`, `kan`, and `voc`.

  Examples:
  - `['rad','kan']` - _(array)_ Return radicals and kanji.
  - `'kan, voc'` - _(string)_ Return kanji and vocabulary.

* **`level`** - A comma-separated list of Wanikani levels or level ranges to return.

  Examples:
  - `'1,2,3'` - Return items from levels 1, 2, and 3.
  - `'1-3,5'` - Return items from levels 1 through 3, and 5.
  - `'-1'` - Return items from your previous level (current level minus 1).
  - `'+1'` - Return items from your next level (current level plus 1).
  - `'-5 - +0'` - Return items from your last 5 levels, including your current level.
  - `'1 - -1'` - Return items from levels 1 through your last level (current minus 1).
  - `'*, !-3 - -1'` - Return items from all levels, but exclude the last three levels.

* **`srs`** - An array or comma-delimited string specifying the SRS levels to return.  Supported values are `appr1`, `appr2`, `appr3`, `appr4`, `guru1`, `guru2`, `mast`, `enli`, and `burn`.

  Examples:
  - `['appr1','appr2','appr3','appr4']` - Return all Apprentice items (Apprentice 1 through 4).
  - `'mast, enli, burn'` - Return all Master, Enlightened, and Burned items.

* **`have_burned`** - _(boolean)_ If `true`, return all items that have been previously burned, even if they are currently resurrected.  If `false`, return all items that have never been burned.

#### <a id="get_items_invert">Inverting filters</a>

You can optionally invert the results of any filter by converting the filter value to an object, and adding an `invert` member to the object.  Below is a before-and-after example:

```javascript
// Fetch all current-level vocabulary.  (Filters not inverted)
var config = {
    wk_items: {
        options: {subjects: true, assignments: true},
        filters: {
            level: '+0',
            item_type: 'voc'
        }
    }
};

// Fetch all EXCEPT current-level vocabulary. (Filters inverted)
var config = {
    wk_items: {
        options: {subjects: true, assignments: true},
        filters: {
            level: {value: '+0', invert: true},
            item_type: {value: 'voc', invert: true}
        }
    }
};
```

#### _Example 3: Fetch items using configuration object_
```javascript
// Include the ItemData module, and wait for it to be ready.
wkof.include('ItemData');
wkof.ready('ItemData').then(fetch_items);

// This function is called when the ItemData module is ready to use.
function fetch_items() {
    // Fetch only radicals and kanji from levels 1-3.
    // Include /subjects and /assignments endpoints
    var config = {
        wk_items: {
            options: {subjects: true, assignments: true},
            filters: {
                level: '1-3',
                item_type: 'rad, kan'
            }
        }
    };

    wkof.ItemData.get_items(config)
    .then(process_items);
}

function process_items(items) {
    // TODO: Do something with the items we retrieved.
    console.log('Retrieved ' + items.length + ' items.');
}

// Output:  Retrieved 171 items.
```

-----

### <a id="itemdata_get_index">`wkof.ItemData.get_index(items, index_name)`</a>

Given an array of items returned by `wkof.ItemData.get_items()`, this function creates an index for looking up items in the array based on a specified data field, such as `subject_id`, `item_type`, `slug`, etc.

#### Parameters:
* **`items`** - An array of items returned by `wkof.ItemData.get_items()`.
* **`index_name`** - Name of one of the available index functions.

#### Return value:
* **`object`** - An object whose keys are the field values of the indexed field.

The following index fields are currently available, and can be found in `wkof.ItemData.registry.indices`:

* **`item_type`** - Index by `item.object`
  ```javascript
  {radical: Array(478), kanji: Array(2027), vocabulary: Array(6287)}
  ```
* **`level`** - Index by `item.data.level` (Wanikani level).
   ```javascript
   {1: Array(86), 2: Array(161), 3: Array(127), 4: Array(176), 5: Array(195), …}
   ```
* **`reading`** - Index by `item.data.readings[].reading`
  ```javascript
  {いち: Array(4), ひと: Array(6), かず: Array(4), に: Array(8), ふた: Array(2), …}
  ```
* **`slug`** - Index by `item.data.slug` (e.g. `"大変"`, `"ground"`). **_(\* See note below!)_**
  ```javascript
  {ground: {…}, fins: {…}, drop: {…}, seven: {…}, slide: {…}, …}
  ```
* **`srs_stage`** - Index by `item.assignments.srs_stage` (e.g. `1`=Apprentice1, `9`=Burned).
  ```javascript
  {0: Array(9), 1: Array(26), 3: {…}, 4: Array(12), 5: Array(15), 6: Array(6), …}
  ```
* **`srs_stage_name`** - Index by `item.assignments.srs_stage_name` (e.g. `Apprentice 1` ... `Burned`).
  ```javascript
  {Burned: Array(293), Enlightened: Array(3), Guru II: Array(6), Master: Array(4), Guru I: Array(15), …}
  ```
* **`subject_id`** - Index by `item.subject_id`.
  ```javascript
  {1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}, 6: {…}, 7: {…}, …}
  ```

**_\* Note: Some `slug` entries may be an array!  For example,_ `slug['円']` _contains both a kanji and vocab._**

#### _Example: index by `slug`:_
```javascript
{
    "ground": {id: 1, object: "radical", data: {slug: "ground", ... }, ...},
    "fins": {id: 2, object: "radical", data: {slug: "fins", ... }, ...},
    "drop": {id: 3, object: "radical", data: {slug: "drop", ... }, ...},
    ...
    "円": [
        {id: 472, object: "kanji", data: {slug: "円", ... }, ...},
        {id: 2499, object: "vocabulary", data: {slug: "円", ... }, ...},
    ],
    ...
}
```

#### _Example 1: Fetch items and index by `item_type` and `slug`_
```javascript
// Include the ItemData module, and wait for it to be ready.
wkof.include('ItemData');
wkof.ready('ItemData').then(fetch_items);

// This function is called when the ItemData module is ready to use.
function fetch_items() {
    // No 'config' parameter, so we retrieve only the Wanikani /subjects endpoint.
    wkof.ItemData.get_items()
    .then(process_items);
}

function process_items(items) {
    // Index the 'items' array by item_type.
    var type_index = wkof.ItemData.get_index(items, 'item_type');
    var rad = type_index['radical'];
    var kan = type_index['kanji'];
    var voc = type_index['vocabulary'];
    console.log(
        'Found ' + rad.length + ' radicals, '+
        kan.length + ' kanji, and '+
        voc.length + ' vocabulary.'
    );

    // Index the 'voc' array by slug.
    var voc_by_name = wkof.ItemData.get_index(voc, 'slug');
    console.log('大きい is on WK Level ' + voc_by_name['大きい'].data.level)
}

// Output:  Found 478 radicals, 2027 kanji, and 6287 vocabulary.
// Output:  大きい is on WK Level 1
```

-----

## <a id="apiv2_module">Apiv2 module</a>

The `Apiv2` module:
* Provides an interface for fetching and caching all Wanikani API endpoint data.
* Is a low-level interface to the Wanikani API, and is used by the the higher-level ItemData module.
* Allows you to specify any filters supported by the Wanikani API.
* Is best for fetching the following Wanikani API endpoints (_see `ItemData` module for other endpoints_):
  - `/user`
  - `/summary`
  - `/reviews`
  - `/level_progressions`
  - `/resets`
* Provides a global 'Loading...' progress bar when fetching data.

Internally, the module also:
* Coordinates requests from all client scripts to prevent redundant requests to the Wanikani API.
* Reduces browser memory consumption by sharing item objects across all scripts.
* Retrieves only the data requested by the user's active client scripts.

To use the `Apiv2` module, you must include it from your script, and wait until the module is ready before accessing it:

```javascript
wkof.include('Apiv2');
wkof.ready('Apiv2').then(do_something);

function do_something() {
    // TODO:  Add your code to access the Apiv2 interface.
    console.log('wkof.Apiv2 is loaded');
}
```

-----

### <a id="apiv2_fetch_endpoint">`wkof.Apiv2.fetch_endpoint(endpoint_name [, options])`</a>

**\* Note: Generally, you should be using `get_endpoint()` instead.**<br>
Retrieves the contents of a Wanikani API endpoint.
Generally, you will want to use `get_endpoint()` instead, which makes use of cache and automatically compensates for the last fetch date.
However, if you need to retrieve data that changed after a specific timestamp, or you need to use specific filters and don't want to use cache, `fetch_endpoint()` may be a better choice.

#### Parameters:
* **`endpoint_name`** - A string containing the name of the endpoint to be fetched (e.g. "summary").
* **`options`** - _(optional)_ An object that specifies additional optional parameters. _(see `Options` below)_

#### Return value:
* **`Promise`** - A Promise that resolves with the fetched endpoint data.

#### <a id="fetch_endpoint_options">Options</a>
The following optional parameters are supported inside the `options` object:
* **`progress_callback`** - A callback function to be called as the fetch makes incremental progress.
The progress_callback function is called with the following parameters:
  - `endpoint_name` - A string containing the name of the endpoint.
  - `first_new` - The index if the first element received in this progress update.
  - `so_far` - The number of elements retrieved since the fetch began.
  - `total` - The total number of elements that will be retrieved in this fetch.
* **`last_update`** - A timestamp string (ISO8601 format).  Only records modified after this time will be returned.
* **`filters`** - A sub-object containing API filters to be added to the request URL.<br>_(See Wanikani API documentation for supported filters on each endpoint)_<br>

#### _Example 1: Fetch level-ups since the start of 2018:_
```javascript
// Include the Apiv2 module, and wait for it to be ready.
wkof.include('Apiv2');
wkof.ready('Apiv2').then(fetch_data);

// This function is called when the Apiv2 module is ready to use.
function fetch_data() {
    var options = {
        last_update: '2018-01-01T00:00:00.000000Z'
    };
    wkof.Apiv2.fetch_endpoint('level_progressions', options)
    .then(process_response);
}

function process_response(response) {
    // Show the results on the Javascript console.
    for (var idx = 0; idx < response.data.length; idx++) {
        var entry = response.data[idx];
        var level = entry.data.level;
        var pass_date = entry.data.passed_at.slice(0, 10);
        console.log('Passed level '+level+' on '+pass_date);
    }
}

// Output:
//   Passed level 4 on 2018-01-17
//   Passed level 5 on 2018-02-03
//   Passed level 6 on 2018-02-20
```

#### _Example 2: Fetch radicals removed from Wanikani since the start of 2014:_
```javascript
// Include the Apiv2 module, and wait for it to be ready.
wkof.include('Apiv2');
wkof.ready('Apiv2').then(fetch_data);

// This function is called when the Apiv2 module is ready to use.
function fetch_data() {
    var options = {
        last_update: '2014-01-01T00:00:00.000000Z',
        filters: {
            types: ['radical'],
            hidden: true
        }
    };
    wkof.Apiv2.fetch_endpoint('subjects', options)
    .then(process_response);
}

function process_response(response) {
    if (response.data.length === 0) {
        // Inject some fake data if no deleted items are currently on record.
        response.data = [{
            "id":59,
            "object":"radical",
            "url":"https://www.wanikani.com/api/v2/subjects/59",
            "data_updated_at":"2018-03-14T00:31:56.396289Z",
            "data":{
                "level":3,
                "created_at":"2012-03-01T01:52:13.000000Z",
                "slug":"raptor-cage",
                "hidden_at":"2018-03-14T00:31:56.396289Z",
                "document_url":"https://www.wanikani.com/radicals/raptor-cage",
                "characters":"久",
                "character_images":[],
                "meanings":[{"meaning":"Raptor Cage","primary":true}]
            }
        }];
    }

    // Show the results on the Javascript console.
    for (var idx = 0; idx < response.data.length; idx++) {
        var entry = response.data[idx];
        var slug = entry.data.slug;
        var hide_date = entry.data.hidden_at.slice(0, 10);
        console.log('Radical "'+slug+'" was removed on '+hide_date);
    }
}

// Output (using injected fake data):
//   Radical "raptor-cage" was removed on 2018-03-14
```

-----

### <a id="apiv2_get_endpoint">`wkof.Apiv2.get_endpoint(endpoint_name [, options])`</a>

**\* Note: For item-related endpoints, please see the `ItemData` module.**<br>
Retrieves the contents of a Wanikani API endpoint.
This function makes use of cache, so only recent changes will be fetched from the server.

#### Parameters:
* **`endpoint_name`** - A string containing the name of the endpoint to be fetched (e.g. "summary").
* **`options`** - _(optional)_ An object that specifies additional optional parameters. _(see `Options` below)_

#### Return value:
* **`Promise`** - A Promise that resolves with the fetched endpoint data.

#### <a id="get_endpoint_options">Options</a>
The following optional parameters are supported inside the `options` object:
* **`progress_callback`** - A callback function to be called as the fetch makes incremental progress.
The progress_callback function is called with the following parameters:
  - `endpoint_name` - A string containing the name of the endpoint.
  - `first_new` - The index if the first element received in this progress update.
  - `so_far` - The number of elements retrieved since the fetch began.
  - `total` - The total number of elements that will be retrieved in this fetch.
* **`force_update`** - By default, `get_endpoint()` will not seek an update from the server if the last update was less than 1 minute ago.  If this flag is `true`, an update is requested every time.

#### _Example: Get the number of lessons and review currently available:_
```javascript
// Include the Apiv2 module, and wait for it to be ready.
wkof.include('Apiv2');
wkof.ready('Apiv2').then(get_data);

// This function is called when the Apiv2 module is ready to use.
function get_data() {
    var options = {
        force_update: true
    };
    wkof.Apiv2.get_endpoint('summary', options)
    .then(process_response);
}

function process_response(response) {
    // Show the results on the Javascript console.
    var lessons = response.lessons;
    var num_items = lessons[0].subject_ids.length;
    console.log(num_items+' lessons available');

    var reviews = response.reviews;
    var num_items = reviews[0].subject_ids.length;
    console.log(num_items+' reviews available');
}

// Output:
//   9 lessons available
//   67 reviews available
```

-----

### <a id="apiv2_clear_cache">`wkof.Apiv2.clear_cache([include_non_user])`</a>

Clears all cached user-specific API data, i.e. everything except the `subjects` endpoint.

#### Parameters:
* **`include_non_user`** - _(optional)_ If `true`, also clear all non-user-specific data.

#### Return value:
* **`Promise`** - A Promise that resolves when the cache is cleared.

#### _Example: Clear all user-specific API data:_
```javascript
// Include the Apiv2 module, and wait for it to be ready.
wkof.include('Apiv2');
wkof.ready('Apiv2').then(clear_cache);

// This function is called when the Apiv2 module is ready to use.
function clear_cache() {
    wkof.Apiv2.clear_cache();
}
```

-----

### <a id="apiv2_is_valid_apikey_format">`wkof.Apiv2.apiv2_is_valid_apikey_format(apikey)`</a>

Checks whether the specified string is a valid APIv2 string format.

#### Parameters:
* **`apikey`** - A string containing an APIv2 key that is to be checked for proper format.

#### Return value:
* **`boolean`** - `true` if the apikey is a valid APIv2 format, otherwise `false`.

#### _Example: Clear all user-specific API data:_
```javascript
// Include the Apiv2 module, and wait for it to be ready.
wkof.include('Apiv2');
wkof.ready('Apiv2').then(check_key);

// This function is called when the Apiv2 module is ready to use.
function check_key() {
    var apikey = '12345678-1234-1234-1234-123456789abc';
    var is_valid = wkof.Apiv2.is_valid_apikey_format(apikey);
    var valid_string = (is_valid ? 'is' : 'is not');
    console.log('Apikey "'+apikey+'" '+valid_string+' correctly formatted.');
}

// Output: Apikey "12345678-1234-1234-1234-123456789abc" is correctly formatted.
```

-----

## <a id="menu_module">Menu module</a>

The `Menu` module provides an interface for adding custom links to the Wanikani menu.

To use the `ItemData` module, you must include it from your script, and wait until the module is ready before accessing it:

```javascript
wkof.include('Menu');
wkof.ready('Menu').then(do_something);

function do_something() {
    // TODO:  Add your code to access the Menu interface.
    console.log('wkof.Menu is loaded');
}
```

-----

### <a id="menu_insert_script_link">`wkof.Menu.insert_script_link(config)`</a>

Retrieves a set of items, applies filters to select a subset of those items, and returns an array of the resulting items.  These items can then be indexed by specific fields using the `get_index()` function.

#### Parameters:
* **`config`** - An object describing the link to be installed.  _(see `Config` below)_

#### <a id="insert_script_link_config">Config</a>

The `config` object contains the following:
* **`name`** - A unique identifier string for the link to be inserted.<br>
The inserted `<li>` element will have `id="<name>_script_link"` and `name="<name>"`.
* **`submenu`** - _(optional)_ A string containing the name of a submenu to (create and) insert the link under.
* **`title`** - A string containing the text of the link.
* **`class`** - _(optional)_ A string containing any class names to be added to the `<li>` element.
* **`on_click`** - A callback function to be called when the link is clicked.

#### _Example: Call a function when a menu link is clicked._
```javascript
// Include the ItemData module, and wait for it to be ready.
wkof.include('Menu');
wkof.ready('Menu').then(install_menu);

// This function is called when the Menu module is ready to use.
function install_menu() {
    var config = {
        name: 'my_script_open',
        submenu: 'Open',
        title: 'My Script',
        on_click: open_my_script
    };
    wkof.Menu.insert_script_link(config);
}

function open_my_script(items) {
    // TODO: Do something useful.
    console.log('Opening "My Script"...');
}

// Output: Opening "My Script"...
```

-----

## <a id="progress_module">Progress module</a>

The `Progress` module provides an pop-up dialog for displaying progress bars.

To use the `Progress` module, you must include it from your script, and wait until the module is ready before accessing it:

```javascript
wkof.include('Progress');
wkof.ready('Progress').then(do_something);

function do_something() {
    // TODO:  Add your code to access the Menu interface.
    console.log('wkof.Progress is loaded');
}
```

-----

### <a id="progress_update">`wkof.Progress.update(progress)`</a>

Initializes or updates the progress on a task.
The progress dialog will appear if the task is not completed within 1 second.
The dialog will close when all active tasks are complete.
Completion occurs when a task's current `value` is equal to or greater than its `max` value.
If more than one task is active at the same time, the dialog will show a separate progress bar for each task.

#### Parameters:
* **`progress`** - An object describing the current progress status.  _(see below)_.

#### <a id="progress_update_progress">Progress</a>

The `progress` object contains the following:
* **`name`** - A unique identifier string for the progress bar.
* **`label`** - A string containing the text to appear next to the progress bar.
* **`value`** - The number of units currently completed.
* **`max`** - The number of units representing 100% completion.

#### _Example: Simulate 'Core10k' data loading over a 5 second period._
```javascript
wkof.include('Progress');
wkof.ready('Progress').then(do_something);

var progress = {
    name: 'my_script_core10k',
    label: 'Core10k Vocabulary',
    value: 0,
    max: 10000
};

function do_something() {
    // Initialize the progress bar.
    progress.value = 0;
    wkof.Progress.update(progress);

    // Simulate some work
    do_some_work();
}

function do_some_work() {
    // Simulate 250ms worth of work.
    setTimeout(function() {
        // Update the progress bar.
        progress.value += 500;
        wkof.Progress.update(progress);

        // Check if we have more work
        if (progress.value < progress.max)
            do_some_work();
    }, 250);
}
```

-----

## <a id="settings_module">Settings module</a>

