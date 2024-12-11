/**
 * @obinexuscomputing/nexus-search v0.1.6-rc
 * A high-performance search indexing and query system that uses a trie data structure and BFS/DFS algorithms for fast full-text search with fuzzy matching.
 * @license ISC
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("idb")):"function"==typeof define&&define.amd?define(["exports","idb"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).NexusSearch={},e.idb)}(this,(function(e,t){"use strict";class r{constructor(e=1e3,t=5,r="LRU"){this.cache=new Map,this.maxSize=e,this.ttl=60*t*1e3,this.strategy=r,this.accessOrder=[],this.stats={hits:0,misses:0,evictions:0}}set(e,t){this.cache.size>=this.maxSize&&this.evict();const r={data:t,timestamp:Date.now(),lastAccessed:Date.now(),accessCount:1};this.cache.set(e,r),this.updateAccessOrder(e)}get(e){const t=this.cache.get(e);return t?this.isExpired(t.timestamp)?(this.cache.delete(e),this.removeFromAccessOrder(e),this.stats.misses++,null):(t.lastAccessed=Date.now(),t.accessCount++,this.updateAccessOrder(e),this.stats.hits++,t.data):(this.stats.misses++,null)}clear(){this.cache.clear(),this.accessOrder=[],this.stats={hits:0,misses:0,evictions:0}}getStats(){return{...this.stats,size:this.cache.size,maxSize:this.maxSize,hitRate:this.stats.hits/(this.stats.hits+this.stats.misses),strategy:this.strategy}}isExpired(e){return Date.now()-e>this.ttl}evict(){const e="LRU"===this.strategy?this.findLRUKey():this.findMRUKey();e&&(this.cache.delete(e),this.removeFromAccessOrder(e),this.stats.evictions++)}findLRUKey(){return this.accessOrder[0]||null}findMRUKey(){return this.accessOrder[this.accessOrder.length-1]||null}updateAccessOrder(e){this.removeFromAccessOrder(e),"LRU"===this.strategy?this.accessOrder.push(e):this.accessOrder.unshift(e)}removeFromAccessOrder(e){const t=this.accessOrder.indexOf(e);-1!==t&&this.accessOrder.splice(t,1)}setStrategy(e){if(e===this.strategy)return;this.strategy=e;const t=[...this.accessOrder];this.accessOrder=[],t.forEach((e=>this.updateAccessOrder(e)))}prune(){let e=0;for(const[t,r]of this.cache.entries())this.isExpired(r.timestamp)&&(this.cache.delete(t),this.removeFromAccessOrder(t),e++);return e}analyze(){const e=this.stats.hits+this.stats.misses,t=e>0?this.stats.hits/e:0;let r=0;const s=new Map;for(const[e,t]of this.cache.entries())r+=t.accessCount,s.set(e,t.accessCount);return{hitRate:t,averageAccessCount:this.cache.size>0?r/this.cache.size:0,mostAccessedKeys:Array.from(s.entries()).sort(((e,t)=>t[1]-e[1])).slice(0,5).map((([e,t])=>({key:e,count:t})))}}}class s{constructor(e={type:"memory"}){this.db=null,this.memoryStorage=new Map,this.storageType=this.determineStorageType(e)}determineStorageType(e){return"memory"!==e.type&&this.isIndexedDBAvailable()?"indexeddb":"memory"}isIndexedDBAvailable(){try{return"undefined"!=typeof indexedDB&&null!==indexedDB}catch(e){return!1}}async initialize(){if("memory"!==this.storageType)try{this.db=await t.openDB("nexus-search-db",1,{upgrade(e){e.createObjectStore("searchIndices",{keyPath:"id"}).createIndex("timestamp","timestamp");e.createObjectStore("metadata",{keyPath:"id"}).createIndex("lastUpdated","lastUpdated")}})}catch(e){this.storageType="memory",console.warn("Failed to initialize IndexedDB, falling back to memory storage:",e)}}async storeIndex(e,t){var r;if("memory"!==this.storageType)try{await(null===(r=this.db)||void 0===r?void 0:r.put("searchIndices",{id:e,data:t,timestamp:Date.now()}))}catch(r){console.error("Storage error:",r),this.memoryStorage.set(e,t)}else this.memoryStorage.set(e,t)}async getIndex(e){var t;if("memory"===this.storageType)return this.memoryStorage.get(e);try{const r=await(null===(t=this.db)||void 0===t?void 0:t.get("searchIndices",e));return null==r?void 0:r.data}catch(t){return console.error("Retrieval error:",t),this.memoryStorage.get(e)}}async clearIndices(){var e;if("memory"!==this.storageType)try{await(null===(e=this.db)||void 0===e?void 0:e.clear("searchIndices"))}catch(e){console.error("Clear error:",e),this.memoryStorage.clear()}else this.memoryStorage.clear()}async close(){this.db&&(this.db.close(),this.db=null),this.memoryStorage.clear()}}function i(e,t){const r={};return t.forEach((t=>{const s=n(e.content,t);void 0!==s&&(r[t]=a(s))})),r}function a(e){return"string"==typeof e?e.toLowerCase().trim():Array.isArray(e)?e.map((e=>a(e))).join(" "):"object"==typeof e&&null!==e?Object.values(e).map((e=>a(e))).join(" "):String(e)}function n(e,t){const r=t.split(".");let s=e;for(const e of r){if(!s||"object"!=typeof s||Array.isArray(s)||!(e in s))return;s=s[e]}return s}function o(e){if(e.maxResults&&e.maxResults<1)throw new Error("maxResults must be greater than 0");if(e.threshold&&(e.threshold<0||e.threshold>1))throw new Error("threshold must be between 0 and 1");if(e.fields&&!Array.isArray(e.fields))throw new Error("fields must be an array")}class c{constructor(){this.dataMap=new Map}mapData(e,t){this.dataMap.has(e)||this.dataMap.set(e,new Set),this.dataMap.get(e).add(t)}getDocuments(e){return this.dataMap.get(e)||new Set}getAllKeys(){return Array.from(this.dataMap.keys())}exportState(){const e={};return this.dataMap.forEach(((t,r)=>{e[r]=Array.from(t)})),e}importState(e){this.dataMap.clear(),Object.entries(e).forEach((([e,t])=>{this.dataMap.set(e,new Set(t))}))}clear(){this.dataMap.clear()}}class h{constructor(){this.children=new Map,this.isEndOfWord=!1,this.documentRefs=new Set,this.weight=0}}class d{constructor(){this.root=new h,this.documents=new Map,this.documentLinks=new Map}insert(e,t){if(!e||!t)return;const r=e.toLowerCase().split(/\s+/).filter(Boolean);for(const e of r){let r=this.root;for(const t of e)r.children.has(t)||r.children.set(t,new h),r=r.children.get(t);r.isEndOfWord=!0,r.documentRefs.add(t),r.weight+=1}}search(e,t=10){if(!e)return new Set;const r=new Set,s=e.toLowerCase().split(/\s+/).filter(Boolean);for(const e of s){let s=this.root,i=!0;for(const t of e){if(!s.children.has(t)){i=!1;break}s=s.children.get(t)}i&&s.isEndOfWord&&this.collectDocumentRefs(s,r,t)}return r}fuzzySearch(e,t=2){if(!e)return new Set;const r=new Set,s=e.toLowerCase().split(/\s+/).filter(Boolean);for(const e of s)this.fuzzySearchHelper(e,this.root,"",t,r);return r}collectDocumentRefs(e,t,r){if(e.isEndOfWord)for(const s of e.documentRefs){if(t.size>=r)return;t.add(s)}for(const s of e.children.values()){if(t.size>=r)return;this.collectDocumentRefs(s,t,r)}}fuzzySearchHelper(e,t,r,s,i){if(!(s<0)){if(t.isEndOfWord){this.calculateLevenshteinDistance(e,r)<=s&&t.documentRefs.forEach((e=>i.add(e)))}for(const[a,n]of t.children){const t=e[r.length]!==a?s-1:s;this.fuzzySearchHelper(e,n,r+a,t,i),s>0&&this.fuzzySearchHelper(e,n,r,s-1,i)}}}calculateLevenshteinDistance(e,t){const r=Array(e.length+1).fill(0).map((()=>Array(t.length+1).fill(0)));for(let t=0;t<=e.length;t++)r[t][0]=t;for(let e=0;e<=t.length;e++)r[0][e]=e;for(let s=1;s<=e.length;s++)for(let i=1;i<=t.length;i++)r[s][i]=Math.min(r[s-1][i]+1,r[s][i-1]+1,r[s-1][i-1]+(e[s-1]!==t[i-1]?1:0));return r[e.length][t.length]}exportState(){return{trie:this.serializeNode(this.root),documents:Array.from(this.documents.entries()),documentLinks:Array.from(this.documentLinks.entries())}}importState(e){this.root=this.deserializeNode(e.trie),this.documents=new Map(e.documents),this.documentLinks=new Map(e.documentLinks)}serializeNode(e){const t={};return e.children.forEach(((e,r)=>{t[r]=this.serializeNode(e)})),{isEndOfWord:e.isEndOfWord,documentRefs:Array.from(e.documentRefs),weight:e.weight,children:t}}deserializeNode(e){var t;const r=new h;return r.isEndOfWord=e.isEndOfWord,r.documentRefs=new Set(e.documentRefs),r.weight=null!==(t=e.weight)&&void 0!==t?t:0,Object.entries(e.children).forEach((([e,t])=>{r.children.set(e,this.deserializeNode(t))})),r}clear(){this.root=new h,this.documents.clear(),this.documentLinks.clear()}getSize(){return this.documents.size}}class l{constructor(){this.dataMapper=new c,this.trieSearch=new d}indexDocument(e,t,r){r.forEach((r=>{const s=e[r];if("string"==typeof s){this.tokenizeText(s).forEach((e=>{this.trieSearch.insert(e,t),this.dataMapper.mapData(e.toLowerCase(),t)}))}}))}search(e,t={}){const{fuzzy:r=!1,maxResults:s=10}=t,i=this.tokenizeText(e),a=new Map;i.forEach((e=>{(r?this.trieSearch.fuzzySearch(e):this.trieSearch.search(e,s)).forEach((t=>{const r=a.get(t)||{score:0,matches:new Set};r.score+=this.calculateScore(t,e),r.matches.add(e),a.set(t,r)}))}));return Array.from(a.entries()).map((([e,{score:t,matches:r}])=>({item:e,score:t/i.length,matches:Array.from(r)}))).sort(((e,t)=>t.score-e.score)).slice(0,s)}exportState(){return{trie:this.trieSearch.exportState(),dataMap:this.dataMapper.exportState()}}importState(e){if(!e||!e.trie||!e.dataMap)throw new Error("Invalid index state");this.trieSearch=new d,this.trieSearch.importState(e.trie),this.dataMapper=new c,this.dataMapper.importState(e.dataMap)}tokenizeText(e){return e.toLowerCase().replace(/[^\w\s]/g," ").split(/\s+/).filter((e=>e.length>0))}calculateScore(e,t){return this.dataMapper.getDocuments(t.toLowerCase()).has(e)?1:.5}clear(){this.trieSearch=new d,this.dataMapper=new c}}class m{constructor(e){this.config=e,this.indexMapper=new l,this.documents=new Map}async addDocuments(e){for(const[t,r]of e.entries()){const e=this.generateDocumentId(t),s={};for(const e of this.config.fields)e in r&&(s[e]=r[e]);const a={id:e,content:i({content:s,id:e},this.config.fields),metadata:r.metadata};this.documents.set(e,{...r,id:e});try{await this.indexMapper.indexDocument(a,e,this.config.fields)}catch(t){console.warn(`Failed to index document ${e}:`,t)}}}async search(e,t={}){var r,s;if(!e.trim())return[];try{return(await this.indexMapper.search(e,{fuzzy:null!==(r=t.fuzzy)&&void 0!==r&&r,maxResults:null!==(s=t.maxResults)&&void 0!==s?s:10})).filter((e=>this.documents.has(e.item))).map((e=>({item:this.documents.get(e.item),score:e.score,matches:e.matches}))).filter((e=>{var r;return e.score>=(null!==(r=t.threshold)&&void 0!==r?r:.5)}))}catch(e){return console.error("Search error:",e),[]}}exportIndex(){return{documents:Array.from(this.documents.entries()).map((([e,t])=>({key:e,value:this.serializeDocument(t)}))),indexState:this.indexMapper.exportState(),config:this.config}}importIndex(e){if(!this.isValidIndexData(e))throw new Error("Invalid index data format");try{const t=e;if(this.documents=new Map(t.documents.map((e=>[e.key,e.value]))),this.config=t.config,this.indexMapper=new l,!this.isValidIndexState(t.indexState))throw new Error("Invalid index state format");this.indexMapper.importState({trie:t.indexState.trie,dataMap:t.indexState.dataMap})}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to import index: ${t}`)}}clear(){this.documents.clear(),this.indexMapper=new l}generateDocumentId(e){return`${this.config.name}-${e}-${Date.now()}`}isValidIndexData(e){if(!e||"object"!=typeof e)return!1;const t=e;return Boolean(t.documents&&Array.isArray(t.documents)&&void 0!==t.indexState&&t.config&&"object"==typeof t.config)}isValidIndexState(e){return null!==e&&"object"==typeof e&&"trie"in e&&"dataMap"in e}serializeDocument(e){return JSON.parse(JSON.stringify(e))}}class u{constructor(){this.STOP_WORDS=new Set(["a","an","and","are","as","at","be","by","for","from","has","he","in","is","it","its","of","on","that","the","to","was","were","will","with"])}process(e){const t=this.tokenize(e),r=this.processTokens(t);return this.optimizeQuery(r)}tokenize(e){return e.toLowerCase().split(/\s+/).filter((e=>e.length>0)).map((e=>this.classifyToken(e)))}classifyToken(e){return e.startsWith("+")||e.startsWith("-")?{type:"operator",value:e}:e.includes(":")?{type:"modifier",value:e}:{type:"term",value:e}}processTokens(e){return e.filter((e=>"term"!==e.type||!this.STOP_WORDS.has(e.value))).map((e=>this.normalizeToken(e)))}normalizeToken(e){if("term"===e.type){let t=e.value;return t.endsWith("ing")&&(t=t.slice(0,-3)),t.endsWith("s")&&(t=t.slice(0,-1)),{...e,value:t}}return e}optimizeQuery(e){return e.map((e=>e.value)).join(" ")}}class f{constructor(e){this.isInitialized=!1,this.config=e,this.indexManager=new m(e),this.queryProcessor=new u,this.storage=new s(e.storage),this.cache=new r,this.eventListeners=new Set,this.trie=new d,this.documents=new Map}async initialize(){if(!this.isInitialized)try{try{await this.storage.initialize()}catch(e){this.emitEvent({type:"storage:error",timestamp:Date.now(),error:e instanceof Error?e:new Error(String(e))}),this.storage=new s({type:"memory"}),await this.storage.initialize()}await this.loadIndexes(),this.isInitialized=!0,this.emitEvent({type:"search:start",timestamp:Date.now()})}catch(e){const t=e instanceof Error?e.message:String(e);throw new Error(`Failed to initialize search engine: ${t}`)}}async addDocuments(e){this.isInitialized||await this.initialize();try{this.emitEvent({type:"index:start",timestamp:Date.now(),data:{documentCount:e.length}});for(const t of e){const e=t.id||this.generateDocumentId();this.documents.set(e,t);const r={id:e,content:i({content:t.fields,id:e},this.config.fields)};for(const t of this.config.fields)if(r.content[t]){const s=String(r.content[t]).toLowerCase().split(/\s+/).filter(Boolean);for(const t of s)this.trie.insert(t,e)}}await this.indexManager.addDocuments(e);try{await this.storage.storeIndex(this.config.name,this.indexManager.exportIndex())}catch(e){this.emitEvent({type:"storage:error",timestamp:Date.now(),error:e instanceof Error?e:new Error(String(e))})}this.cache.clear(),this.emitEvent({type:"index:complete",timestamp:Date.now(),data:{documentCount:e.length}})}catch(e){throw this.emitEvent({type:"index:error",timestamp:Date.now(),error:e instanceof Error?e:new Error(String(e))}),new Error(`Failed to add documents: ${e}`)}}async search(e,t={}){this.isInitialized||await this.initialize(),o(t);const r=Date.now();this.emitEvent({type:"search:start",timestamp:r,data:{query:e,options:t}});const s=this.generateCacheKey(e,t),i=this.cache.get(s);if(i)return i;try{const i=this.queryProcessor.process(e),a=await this.indexManager.search(i,t);return this.cache.set(s,a),this.emitEvent({type:"search:complete",timestamp:Date.now(),data:{query:e,options:t,resultCount:a.length,searchTime:Date.now()-r}}),a}catch(e){throw this.emitEvent({type:"search:error",timestamp:Date.now(),error:e instanceof Error?e:new Error(String(e))}),new Error(`Search failed: ${e}`)}}addEventListener(e){this.eventListeners.add(e)}removeEventListener(e){this.eventListeners.delete(e)}emitEvent(e){this.eventListeners.forEach((t=>{try{t(e)}catch(e){console.error("Error in event listener:",e)}}))}async loadIndexes(){try{const e=await this.storage.getIndex(this.config.name);e&&this.indexManager.importIndex(e)}catch(e){console.warn("Failed to load stored index, starting fresh:",e)}}generateCacheKey(e,t){return`${this.config.name}-${e}-${JSON.stringify(t)}`}generateDocumentId(){return`${this.config.name}-${Date.now()}-${Math.random().toString(36).substring(2,15)}`}async clearIndex(){try{await this.storage.clearIndices()}catch(e){console.warn("Failed to clear storage, continuing:",e)}this.documents.clear(),this.trie=new d,this.indexManager.clear(),this.cache.clear()}async close(){try{await this.storage.close(),this.cache.clear(),this.documents.clear(),this.isInitialized=!1}catch(e){console.warn("Error during close:",e)}}getIndexedDocumentCount(){return this.documents.size}getTrieState(){return this.trie.exportState()}}class p extends Error{constructor(e){super(e),this.name="ValidationError"}}class y extends Error{constructor(e){super(e),this.name="StorageError"}}var g;e.CacheStrategyType=void 0,(g=e.CacheStrategyType||(e.CacheStrategyType={})).LRU="LRU",g.MRU="MRU";const w={caseSensitive:!1,stemming:!0,stopWords:["the","a","an","and","or","but"],minWordLength:2,maxWordLength:50,fuzzyThreshold:.8},S={fuzzy:!1,maxResults:10,threshold:.5,fields:[],sortBy:"score",sortOrder:"desc",page:1,pageSize:10};class x extends Error{constructor(e){super(e),this.name="SearchError"}}class E extends Error{constructor(e){super(e),this.name="IndexError"}}function v(e){if(!e||"object"!=typeof e)return!1;const t=e;return!(void 0!==t.fuzzy&&"boolean"!=typeof t.fuzzy||void 0!==t.maxResults&&"number"!=typeof t.maxResults)}function z(e){if(!e||"object"!=typeof e)return!1;const t=e;return Boolean("string"==typeof t.name&&"number"==typeof t.version&&Array.isArray(t.fields))}function b(e){if(!e||"object"!=typeof e)return!1;const t=e;return Boolean("item"in t&&"number"==typeof t.score&&Array.isArray(t.matches))}const I={DEFAULT_INDEX_OPTIONS:w,DEFAULT_SEARCH_OPTIONS:S,SearchError:x,IndexError:E,SearchEngine:f,IndexManager:m,QueryProcessor:u,TrieNode:h,TrieSearch:d,isSearchOptions:v,isIndexConfig:z,isSearchResult:b};"undefined"!=typeof window&&(window.NexusSearch=I);const M=I;e.CacheManager=r,e.DEFAULT_INDEX_OPTIONS=w,e.DEFAULT_SEARCH_OPTIONS=S,e.DataMapper=c,e.IndexError=E,e.IndexManager=m,e.IndexMapper=l,e.IndexedDB=class{constructor(){this.db=null,this.DB_NAME="nexus_search_db",this.DB_VERSION=1,this.initPromise=null,this.initPromise=this.initialize()}async initialize(){if(!this.db)try{this.db=await t.openDB(this.DB_NAME,this.DB_VERSION,{upgrade(e){if(!e.objectStoreNames.contains("searchIndices")){e.createObjectStore("searchIndices",{keyPath:"id"}).createIndex("timestamp","timestamp")}if(!e.objectStoreNames.contains("metadata")){e.createObjectStore("metadata",{keyPath:"id"}).createIndex("lastUpdated","lastUpdated")}},blocked(){console.warn("Database upgrade was blocked")},blocking(){console.warn("Current database version is blocking a newer version")},terminated(){console.error("Database connection was terminated")}})}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Storage initialization failed: ${t}`)}}async ensureConnection(){if(this.initPromise&&await this.initPromise,!this.db)throw new Error("Database connection not available")}async storeIndex(e,t){await this.ensureConnection();try{const r={id:e,data:t,timestamp:Date.now()};await this.db.put("searchIndices",r)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to store index: ${t}`)}}async getIndex(e){var t;await this.ensureConnection();try{const r=await this.db.get("searchIndices",e);return null!==(t=null==r?void 0:r.data)&&void 0!==t?t:null}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to retrieve index: ${t}`)}}async updateMetadata(e){await this.ensureConnection();try{const t={id:"config",config:e,lastUpdated:Date.now()};await this.db.put("metadata",t)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to update metadata: ${t}`)}}async getMetadata(){await this.ensureConnection();try{const e=await this.db.get("metadata","config");return null!=e?e:null}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to retrieve metadata: ${t}`)}}async clearIndices(){await this.ensureConnection();try{await this.db.clear("searchIndices")}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to clear indices: ${t}`)}}async deleteIndex(e){await this.ensureConnection();try{await this.db.delete("searchIndices",e)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to delete index: ${t}`)}}async close(){this.db&&(this.db.close(),this.db=null)}},e.NexusSearch=M,e.PerformanceMonitor=class{constructor(){this.metrics=new Map}async measure(e,t){const r=performance.now();try{return await t()}finally{const t=performance.now()-r;this.recordMetric(e,t)}}recordMetric(e,t){this.metrics.has(e)||this.metrics.set(e,[]),this.metrics.get(e).push(t)}getMetrics(){const e={};return this.metrics.forEach(((t,r)=>{e[r]={avg:this.average(t),min:Math.min(...t),max:Math.max(...t),count:t.length}})),e}average(e){return e.reduce(((e,t)=>e+t),0)/e.length}clear(){this.metrics.clear()}},e.QueryProcessor=u,e.SearchEngine=f,e.SearchError=x,e.StorageError=y,e.TrieNode=h,e.TrieSearch=d,e.ValidationError=p,e.createSearchableFields=i,e.default=M,e.getNestedValue=n,e.isIndexConfig=z,e.isSearchOptions=v,e.isSearchResult=b,e.normalizeFieldValue=a,e.optimizeIndex=function(e){const t=Array.from(new Set(e.map((e=>JSON.stringify(e))))).map((e=>JSON.parse(e))).sort(((e,t)=>JSON.stringify(e).localeCompare(JSON.stringify(t))));return{data:t,stats:{originalSize:e.length,optimizedSize:t.length,compressionRatio:t.length/e.length}}},e.validateDocument=function(e,t){return t.every((t=>void 0!==n(e.content,t)))},e.validateIndexConfig=function(e){if(!e.name)throw new Error("Index name is required");if(!e.version||"number"!=typeof e.version)throw new Error("Valid version number is required");if(!Array.isArray(e.fields)||0===e.fields.length)throw new Error("At least one field must be specified for indexing")},e.validateSearchOptions=o,Object.defineProperty(e,"__esModule",{value:!0})}));
//# sourceMappingURL=index.umd.js.map
