// ==UserScript==
// @name        Wanikani Open Framework
// @namespace   rfindley
// @description Framework for writing scripts for Wanikani
// @version     1.0.54
// @include     /^https://(www|preview).wanikani.com//
// @copyright   2018+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-start
// @grant       none
// ==/UserScript==

(function(global) {
	'use strict';

	/* eslint no-multi-spaces: off */
	/* globals wkof */

	var version = '1.0.54';
	var ignore_missing_indexeddb = false;

	//########################################################################
	//------------------------------
	// Supported Modules
	//------------------------------
	var supported_modules = {
		Apiv2:    { url: 'https://greasyfork.org/scripts/38581-wanikani-open-framework-apiv2-module/code/Wanikani%20Open%20Framework%20-%20Apiv2%20module.js?version=747866'},
		ItemData: { url: 'https://greasyfork.org/scripts/38580-wanikani-open-framework-itemdata-module/code/Wanikani%20Open%20Framework%20-%20ItemData%20module.js?version=767868'},
		Menu:     { url: 'https://greasyfork.org/scripts/38578-wanikani-open-framework-menu-module/code/Wanikani%20Open%20Framework%20-%20Menu%20module.js?version=1021648'},
		Progress: { url: 'https://greasyfork.org/scripts/38577-wanikani-open-framework-progress-module/code/Wanikani%20Open%20Framework%20-%20Progress%20module.js?version=601473'},
		Settings: { url: 'https://greasyfork.org/scripts/38576-wanikani-open-framework-settings-module/code/Wanikani%20Open%20Framework%20-%20Settings%20module.js?version=850176'},
	};

	//########################################################################
	//------------------------------
	// Published interface
	//------------------------------
	var published_interface = {
		include: include,              // include(module_list)        => Promise
		ready:   ready,                // ready(module_list)          => Promise

		load_file:   load_file,        // load_file(url, use_cache)   => Promise
		load_css:    load_css,         // load_css(url, use_cache)    => Promise
		load_script: load_script,      // load_script(url, use_cache) => Promise

		file_cache: {
			dir:    {},                // Object containing directory of files.
			ls:     file_cache_list,   // ls()
			clear:  file_cache_clear,  // clear()             => Promise
			delete: file_cache_delete, // delete(name)        => Promise
			flush:  file_cache_flush,  // flush()             => Promise
			load:   file_cache_load,   // load(name)          => Promise
			save:   file_cache_save,   // save(name, content) => Promise
			no_cache:file_nocache,     // no_cache(modules)
		},

		on:      wait_event,           // on(event, callback)
		trigger: trigger_event,        // trigger(event[, data1[, data2[, ...]]])

		get_state:  get_state,         // get(state_var)
		set_state:  set_state,         // set(state_var, value)
		wait_state: wait_state,        // wait(state_var, value[, callback[, persistent]]) => if no callback, return one-shot Promise

		version: {
			value: version,
			compare_to: compare_to,    // compare_version(version)
		}
	};

	published_interface.support_files = {
		'jquery_ui.js': 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js',
		'jqui_wkmain.css': 'https://raw.githubusercontent.com/rfindley/wanikani-open-framework/1550af8383ec28ad406cf401aee2de4c52446f6c/jqui-wkmain.css',
	};

	//########################################################################

	function split_list(str) {return str.replace(/、/g,',').replace(/[\s　]+/g,' ').trim().replace(/ *, */g, ',').split(',').filter(function(name) {return (name.length > 0);});}
	function promise(){var a,b,c=new Promise(function(d,e){a=d;b=e;});c.resolve=a;c.reject=b;return c;}

	//########################################################################

	//------------------------------
	// Compare the framework version against a specific version.
	//------------------------------
	function compare_to(client_version) {
		var client_ver = client_version.split('.').map(d => Number(d));
		var wkof_ver = version.split('.').map(d => Number(d));
		var len = Math.max(client_ver.length, wkof_ver.length);
		for (var idx = 0; idx < len; idx++) {
			var a = client_ver[idx] || 0;
			var b = wkof_ver[idx] || 0;
			if (a === b) continue;
			if (a < b) return 'newer';
			return 'older';
		}
		return 'same';
	}

	//------------------------------
	// Include a list of modules.
	//------------------------------
	var include_promises = {};

	function include(module_list) {
		if (wkof.get_state('wkof.wkof') !== 'ready') {
			return wkof.ready('wkof').then(function(){return wkof.include(module_list);});
		}
		var include_promise = promise();
		var module_names = split_list(module_list);
		var script_cnt = module_names.length;
		if (script_cnt === 0) {
			include_promise.resolve({loaded:[], failed:[]});
			return include_promise;
		}

		var done_cnt = 0;
		var loaded = [], failed = [];
		var no_cache = split_list(localStorage.getItem('wkof.include.nocache') || '');
		for (var idx = 0; idx < module_names.length; idx++) {
			var module_name = module_names[idx];
			var module = supported_modules[module_name];
			if (!module) {
				failed.push({name:module_name, url:undefined});
				check_done();
				continue;
			}
			var await_load = include_promises[module_name];
			var use_cache = (no_cache.indexOf(module_name) < 0) && (no_cache.indexOf('*') < 0);
			if (!use_cache) file_cache_delete(module.url);
			if (await_load === undefined) include_promises[module_name] = await_load = load_script(module.url, use_cache);
			await_load.then(push_loaded, push_failed);
		}

		return include_promise;

		function push_loaded(url) {
			loaded.push(url);
			check_done();
		}

		function push_failed(url) {
			failed.push(url);
			check_done();
		}

		function check_done() {
			if (++done_cnt < script_cnt) return;
			if (failed.length === 0) include_promise.resolve({loaded:loaded, failed:failed});
			else include_promise.reject({error:'Failure loading module', loaded:loaded, failed:failed});
		}
	}

	//------------------------------
	// Wait for all modules to report that they are ready
	//------------------------------
	function ready(module_list) {
		var module_names = split_list(module_list);

		var ready_promises = [ ];
		for (var idx in module_names) {
			var module_name = module_names[idx];
			ready_promises.push(wait_state('wkof.' + module_name, 'ready'));
		}

		if (ready_promises.length === 0) {
			return Promise.resolve();
		} else if (ready_promises.length === 1) {
			return ready_promises[0];
		} else {
			return Promise.all(ready_promises);
		}
	}
	//########################################################################

	//------------------------------
	// Load a file asynchronously, and pass the file as resolved Promise data.
	//------------------------------
	function load_file(url, use_cache) {
		var fetch_promise = promise();
		var no_cache = split_list(localStorage.getItem('wkof.load_file.nocache') || '');
		if (no_cache.indexOf(url) >= 0 || no_cache.indexOf('*') >= 0) use_cache = false;
		if (use_cache === true) {
			return file_cache_load(url, use_cache).catch(fetch_url);
		} else {
			return fetch_url();
		}

		// Retrieve file from server
		function fetch_url(){
			var request = new XMLHttpRequest();
			request.onreadystatechange = process_result;
			request.open('GET', url, true);
			request.send();
			return fetch_promise;
		}

		function process_result(event){
			if (event.target.readyState !== 4) return;
			if (event.target.status >= 400 || event.target.status === 0) return fetch_promise.reject(event.target.status);
			if (use_cache) {
				file_cache_save(url, event.target.response)
				.then(fetch_promise.resolve.bind(null,event.target.response));
			} else {
				fetch_promise.resolve(event.target.response);
			}
		}
	}

	//------------------------------
	// Load and install a specific file type into the DOM.
	//------------------------------
	function load_and_append(url, tag_name, location, use_cache) {
		url = url.replace(/"/g,'\'');
		if (document.querySelector(tag_name+'[uid="'+url+'"]') !== null) return Promise.resolve();
		return load_file(url, use_cache).then(append_to_tag);

		function append_to_tag(content) {
			var tag = document.createElement(tag_name);
			tag.innerHTML = content;
			tag.setAttribute('uid', url);
			document.querySelector(location).appendChild(tag);
			return url;
		}
	}

	//------------------------------
	// Load and install a CSS file.
	//------------------------------
	function load_css(url, use_cache) {
		return load_and_append(url, 'style', 'head', use_cache);
	}

	//------------------------------
	// Load and install Javascript.
	//------------------------------
	function load_script(url, use_cache) {
		return load_and_append(url, 'script', 'body', use_cache);
	}
	//########################################################################

	var state_listeners = {};
	var state_values = {};

	//------------------------------
	// Get the value of a state variable, and notify listeners.
	//------------------------------
	function get_state(state_var) {
		return state_values[state_var];
	}

	//------------------------------
	// Set the value of a state variable, and notify listeners.
	//------------------------------
	function set_state(state_var, value) {
		var old_value = state_values[state_var];
		if (old_value === value) return;
		state_values[state_var] = value;

		// Do listener callbacks, and remove non-persistent listeners
		var listeners = state_listeners[state_var];
		var persistent_listeners = [ ];
		for (var idx in listeners) {
			var listener = listeners[idx];
			var keep = true;
			if (listener.value === value || listener.value === '*') {
				keep = listener.persistent;
				try {
					listener.callback(value, old_value);
				} catch (e) {}
			}
			if (keep) persistent_listeners.push(listener);
		}
		state_listeners[state_var] = persistent_listeners;
	}

	//------------------------------
	// When state of state_var changes to value, call callback.
	// If persistent === true, continue listening for additional state changes
	// If value is '*', callback will be called for all state changes.
	//------------------------------
	function wait_state(state_var, value, callback, persistent) {
		var promise;
		if (callback === undefined) {
			promise = new Promise(function(resolve, reject) {
				callback = resolve;
			});
		}
		if (state_listeners[state_var] === undefined) state_listeners[state_var] = [ ];
		persistent = (persistent === true);
		var current_value = state_values[state_var];
		if (persistent || value !== current_value) state_listeners[state_var].push({callback:callback, persistent:persistent, value:value});

		// If it's already at the desired state, call the callback immediately.
		if (value === current_value) {
			try {
				callback(value, current_value);
			} catch (err) {}
		}
		return promise;
	}
	//########################################################################

	var event_listeners = {};

	//------------------------------
	// Fire an event, which then calls callbacks for any listeners.
	//------------------------------
	function trigger_event(event) {
		var listeners = event_listeners[event];
		if (listeners === undefined) return;
		var args = [];
		Array.prototype.push.apply(args,arguments);
		args.shift();
		for (var idx in listeners) try {
			listeners[idx].apply(null,args);
		} catch (err) {}
		return global.wkof;
	}

	//------------------------------
	// Add a listener for an event.
	//------------------------------
	function wait_event(event, callback) {
		if (event_listeners[event] === undefined) event_listeners[event] = [];
		event_listeners[event].push(callback);
		return global.wkof;
	}
	//########################################################################

	var file_cache_open_promise;

	//------------------------------
	// Open the file_cache database (or return handle if open).
	//------------------------------
	function file_cache_open() {
		if (file_cache_open_promise) return file_cache_open_promise;
		var open_promise = promise();
		file_cache_open_promise = open_promise;
		var request;
		request = indexedDB.open('wkof.file_cache');
		request.onupgradeneeded = upgrade_db;
		request.onsuccess = get_dir;
		request.onerror = error;
		return open_promise;

		function error() {
			console.log('indexedDB could not open!');
			wkof.file_cache.dir = {};
			if (ignore_missing_indexeddb) {
				open_promise.resolve(null);
			} else {
				open_promise.reject();
			}
		}

		function upgrade_db(event){
			var db = event.target.result;
			var store = db.createObjectStore('files', {keyPath:'name'});
		}

		function get_dir(event){
			var db = event.target.result;
			var transaction = db.transaction('files', 'readonly');
			var store = transaction.objectStore('files');
			var request = store.get('[dir]');
			request.onsuccess = process_dir;
			transaction.oncomplete = open_promise.resolve.bind(null, db);
			open_promise.then(setTimeout.bind(null, file_cache_cleanup, 10000));
		}

		function process_dir(event){
			if (event.target.result === undefined) {
				wkof.file_cache.dir = {};
			} else {
				wkof.file_cache.dir = JSON.parse(event.target.result.content);
			}
		}
	}

	//------------------------------
	// Lists the content of the file_cache.
	//------------------------------
	function file_cache_list() {
		console.log(Object.keys(wkof.file_cache.dir).sort().join('\n'));
	}

	//------------------------------
	// Clear the file_cache database.
	//------------------------------
	function file_cache_clear() {
		return file_cache_open().then(clear);

		function clear(db) {
			var clear_promise = promise();
			wkof.file_cache.dir = {};
			if (db === null) return clear_promise.resolve();
			var transaction = db.transaction('files', 'readwrite');
			var store = transaction.objectStore('files');
			store.clear();
			transaction.oncomplete = clear_promise.resolve;
		}
	}

	//------------------------------
	// Delete a file from the file_cache database.
	//------------------------------
	function file_cache_delete(pattern) {
		return file_cache_open().then(del);

		function del(db) {
			var del_promise = promise();
			if (db === null) return del_promise.resolve();
			var transaction = db.transaction('files', 'readwrite');
			var store = transaction.objectStore('files');
			var files = Object.keys(wkof.file_cache.dir).filter(function(file){
				if (pattern instanceof RegExp) {
					return file.match(pattern) !== null;
				} else {
					return (file === pattern);
				}
			});
			files.forEach(function(file){
				store.delete(file);
				delete wkof.file_cache.dir[file];
			});
			file_cache_dir_save();
			transaction.oncomplete = del_promise.resolve.bind(null, files);
			return del_promise;
		}
	}

	//------------------------------
	// Force immediate save of file_cache directory.
	//------------------------------
	function file_cache_flush() {
		file_cache_dir_save(true /* immediately */);
	}

	//------------------------------
	// Load a file from the file_cache database.
	//------------------------------
	function file_cache_load(name) {
		var load_promise = promise();
		return file_cache_open().then(load);

		function load(db) {
			if (wkof.file_cache.dir[name] === undefined) {
				load_promise.reject(name);
				return load_promise;
			}
			var transaction = db.transaction('files', 'readonly');
			var store = transaction.objectStore('files');
			var request = store.get(name);
			wkof.file_cache.dir[name].last_loaded = new Date().toISOString();
			file_cache_dir_save();
			request.onsuccess = finish;
			request.onerror = error;
			return load_promise;

			function finish(event){
				if (event.target.result === undefined) {
					load_promise.reject(name);
				} else {
					load_promise.resolve(event.target.result.content);
				}
			}

			function error(event){
				load_promise.reject(name);
			}
		}
	}

	//------------------------------
	// Save a file into the file_cache database.
	//------------------------------
	function file_cache_save(name, content, extra_attribs) {
		return file_cache_open().then(save);

		function save(db) {
			var save_promise = promise();
			if (db === null) return save_promise.resolve(name);
			var transaction = db.transaction('files', 'readwrite');
			var store = transaction.objectStore('files');
			store.put({name:name,content:content});
			var now = new Date().toISOString();
			wkof.file_cache.dir[name] = Object.assign({added:now, last_loaded:now}, extra_attribs);
			file_cache_dir_save(true /* immediately */);
			transaction.oncomplete = save_promise.resolve.bind(null, name);
		}
	}

	//------------------------------
	// Save a the file_cache directory contents.
	//------------------------------
	var fc_sync_timer;
	function file_cache_dir_save(immediately) {
		if (fc_sync_timer !== undefined) clearTimeout(fc_sync_timer);
		var delay = (immediately ? 0 : 2000);
		fc_sync_timer = setTimeout(save, delay);

		function save(){
			file_cache_open().then(save2);
		}

		function save2(db){
			fc_sync_timer = undefined;
			var transaction = db.transaction('files', 'readwrite');
			var store = transaction.objectStore('files');
			store.put({name:'[dir]',content:JSON.stringify(wkof.file_cache.dir)});
		}
	}

	//------------------------------
	// Remove files that haven't been accessed in a while.
	//------------------------------
	function file_cache_cleanup() {
		var threshold = new Date() - 14*86400000; // 14 days
		var old_files = [];
		for (var fname in wkof.file_cache.dir) {
			if (fname.match(/^wkof\.settings\./)) continue; // Don't flush settings files.
			var fdate = new Date(wkof.file_cache.dir[fname].last_loaded);
			if (fdate < threshold) old_files.push(fname);
		}
		if (old_files.length === 0) return;
		console.log('Cleaning out '+old_files.length+' old file(s) from "wkof.file_cache":');
		for (var fnum in old_files) {
			console.log('  '+(Number(fnum)+1)+': '+old_files[fnum]);
			wkof.file_cache.delete(old_files[fnum]);
		}
	}

	//------------------------------
	// Process no-cache requests.
	//------------------------------
	function file_nocache(list) {
		if (list === undefined) {
			list = split_list(localStorage.getItem('wkof.include.nocache') || '');
			list = list.concat(split_list(localStorage.getItem('wkof.load_file.nocache') || ''));
			console.log(list.join(','));
		} else if (typeof list === 'string') {
			var no_cache = split_list(list);
			var idx, modules = [], urls = [];
			for (idx = 0; idx < no_cache.length; idx++) {
				var item = no_cache[idx];
				if (supported_modules[item] !== undefined) {
					modules.push(item);
				} else {
					urls.push(item);
				}
			}
			console.log('Modules: '+modules.join(','));
			console.log('   URLs: '+urls.join(','));
			localStorage.setItem('wkof.include.nocache', modules.join(','));
			localStorage.setItem('wkof.load_file.nocache', urls.join(','));
		}
	}

	function doc_ready() {
		wkof.set_state('wkof.document', 'ready');
	}

	//########################################################################
	// Bootloader Startup
	//------------------------------
	function startup() {
		global.wkof = published_interface;

		// Mark document state as 'ready'.
		if (document.readyState === 'complete') {
			doc_ready();
		} else {
			window.addEventListener("load", doc_ready, false);  // Notify listeners that we are ready.
		}

		// Open cache, so wkof.file_cache.dir is available to console immediately.
		file_cache_open();
		wkof.set_state('wkof.wkof', 'ready');
	}
	startup();

})(window);

