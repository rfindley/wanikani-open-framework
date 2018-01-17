# Installation

To install:
1. Copy the contents of `Core.js` into a new script in TamperMonkey (or whatever)
2. Move the script to slot #1 in TamperMonkey so it will run before any client scripts that use it.
3. Add the Update URL in TamperMonkey if you want to keep up to date during development:
https://raw.githubusercontent.com/rfindley/wanikani-open-framework/master/Core.js
(This won't be the permanent address.  Releases will be on GreasyFork to take advantage of the 'Install' button, statistics, and simpler diffing)

Installing the sample_client.js:
1. Copy the contents of `sample_client.js` into a new script in TamperMonkey (or whatever)
2. Make sure the sample client is set to run *after* the `Wanikani Open Framework` script (`Core.js`).
3. You probably don't want to auto-update this one, otherwise you may overwrite any changes you make while exploring the framework.

