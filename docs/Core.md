# Core

The Core.js contains:
```javascript
file_cache    // Some functions for caching files in indexeddb.
    dir {}    // An object containing a list of files stored in indexeddb.
    clear()   // Clear the file_cache.
    load()    // Save a file to file_cache.
    save()    // Load a file from file_cache.
    delete()  // Delete a file from file_cache

include()     // Include a module for use with your script (Apiv2, Menu, Settings).
ready()       // Returns a promise that resolves when the specified module is ready to be used.

get_state()   // Get the current state of a state variable.
set_state()   // Set the state of a state variable.
wait_state()  // Returns a promise that resolves when a state variable reaches a specified state.

trigger()     // Initiates a framework event.
on()          // Specify a function to be called when the specified event is triggered.

load_file()   // Loads a file from cache or url.  Returns a promise that resolve with the file contents.
load_css()    // Loads a css file and installs it into the document.
load_script() // Loads a javascript file and installs it into the document.
```

