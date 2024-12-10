/**
 * @obinexuscomputing/nexus-search v0.1.8
 * A high-performance search indexing and query system that uses a trie data structure and BFS/DFS algorithms for fast full-text search with fuzzy matching.
 * @license ISC
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("idb")):"function"==typeof define&&define.amd?define(["exports","idb"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).NexusSearch={},e.idb)}(this,(function(e,t){"use strict";class r{constructor(e=1e3,t=5){this.cache=new Map,this.maxSize=e,this.ttl=60*t*1e3}set(e,t){this.cache.size>=this.maxSize&&this.evictOldest(),this.cache.set(e,{data:t,timestamp:Date.now()})}get(e){const t=this.cache.get(e);return t?this.isExpired(t.timestamp)?(this.cache.delete(e),null):t.data:null}isExpired(e){return Date.now()-e>this.ttl}evictOldest(){let e=null,t=1/0;for(const[r,a]of this.cache.entries())a.timestamp<t&&(t=a.timestamp,e=r);e&&this.cache.delete(e)}clear(){this.cache.clear()}}class a{constructor(e={type:"memory"}){this.db=null,this.memoryStorage=new Map,this.storageType=this.determineStorageType(e)}determineStorageType(e){return"memory"!==e.type&&this.isIndexedDBAvailable()?"indexeddb":"memory"}isIndexedDBAvailable(){try{return"undefined"!=typeof indexedDB&&null!==indexedDB}catch(e){return!1}}async initialize(){if("memory"!==this.storageType)try{this.db=await t.openDB("nexus-search-db",1,{upgrade(e){e.createObjectStore("searchIndices",{keyPath:"id"}).createIndex("timestamp","timestamp");e.createObjectStore("metadata",{keyPath:"id"}).createIndex("lastUpdated","lastUpdated")}})}catch(e){this.storageType="memory",console.warn("Failed to initialize IndexedDB, falling back to memory storage:",e)}}async storeIndex(e,t){var r;if("memory"!==this.storageType)try{await(null===(r=this.db)||void 0===r?void 0:r.put("searchIndices",{id:e,data:t,timestamp:Date.now()}))}catch(r){console.error("Storage error:",r),this.memoryStorage.set(e,t)}else this.memoryStorage.set(e,t)}async getIndex(e){var t;if("memory"===this.storageType)return this.memoryStorage.get(e);try{const r=await(null===(t=this.db)||void 0===t?void 0:t.get("searchIndices",e));return null==r?void 0:r.data}catch(t){return console.error("Retrieval error:",t),this.memoryStorage.get(e)}}async clearIndices(){var e;if("memory"!==this.storageType)try{await(null===(e=this.db)||void 0===e?void 0:e.clear("searchIndices"))}catch(e){console.error("Clear error:",e),this.memoryStorage.clear()}else this.memoryStorage.clear()}async close(){this.db&&(this.db.close(),this.db=null),this.memoryStorage.clear()}}function i(e,t){const r={};return t.forEach((t=>{const a=n(e.content,t);void 0!==a&&(r[t]=s(a))})),r}function s(e){return"string"==typeof e?e.toLowerCase().trim():Array.isArray(e)?e.map((e=>s(e))).join(" "):"object"==typeof e&&null!==e?Object.values(e).map((e=>s(e))).join(" "):String(e)}function n(e,t){const r=t.split(".");let a=e;for(const e of r){if(!a||"object"!=typeof a||Array.isArray(a)||!(e in a))return;a=a[e]}return a}function o(e){if(e.maxResults&&e.maxResults<1)throw new Error("maxResults must be greater than 0");if(e.threshold&&(e.threshold<0||e.threshold>1))throw new Error("threshold must be between 0 and 1");if(e.fields&&!Array.isArray(e.fields))throw new Error("fields must be an array")}class c{constructor(){this.dataMap=new Map}mapData(e,t){this.dataMap.has(e)||this.dataMap.set(e,new Set),this.dataMap.get(e).add(t)}getDocuments(e){return this.dataMap.get(e)||new Set}getAllKeys(){return Array.from(this.dataMap.keys())}exportState(){const e={};return this.dataMap.forEach(((t,r)=>{e[r]=Array.from(t)})),e}importState(e){this.dataMap.clear(),Object.entries(e).forEach((([e,t])=>{this.dataMap.set(e,new Set(t))}))}clear(){this.dataMap.clear()}}class h{constructor(){this.children=new Map,this.isEndOfWord=!1,this.documentRefs=new Set,this.weight=0}}class d{constructor(){this.root=new h,this.documents=new Map,this.documentLinks=new Map}exportState(){return{trie:this.serializeNode(this.root),documents:Array.from(this.documents.entries()),documentLinks:Array.from(this.documentLinks.entries())}}importState(e){this.root=this.deserializeNode(e.trie),e.documents&&(this.documents=new Map(e.documents)),e.documentLinks&&(this.documentLinks=new Map(e.documentLinks))}insert(e,t){let r=this.root;for(const t of e.toLowerCase())r.children.has(t)||r.children.set(t,new h),r=r.children.get(t);r.isEndOfWord=!0,r.documentRefs.add(t)}search(e,t=10){const r=new Set;let a=this.root;for(const t of e.toLowerCase()){if(!a.children.has(t))return r;a=a.children.get(t)}return this.collectDocumentRefs(a,r,t),r}fuzzySearch(e,t=2){const r=new Set;return this.fuzzySearchHelper(e.toLowerCase(),this.root,"",t,r),r}collectDocumentRefs(e,t,r){if(e.isEndOfWord)for(const a of e.documentRefs){if(t.size>=r)return;t.add(a)}for(const a of e.children.values()){if(t.size>=r)return;this.collectDocumentRefs(a,t,r)}}fuzzySearchHelper(e,t,r,a,i){if(!(a<0)){if(t.isEndOfWord){this.calculateLevenshteinDistance(e,r)<=a&&t.documentRefs.forEach((e=>i.add(e)))}if(a>0)for(const[s,n]of t.children){const t=e[r.length]!==s?a-1:a;this.fuzzySearchHelper(e,n,r+s,t,i)}}}calculateLevenshteinDistance(e,t){const r=Array(e.length+1).fill(0).map((()=>Array(t.length+1).fill(0)));for(let t=0;t<=e.length;t++)r[t][0]=t;for(let e=0;e<=t.length;e++)r[0][e]=e;for(let a=1;a<=e.length;a++)for(let i=1;i<=t.length;i++)r[a][i]=Math.min(r[a-1][i]+1,r[a][i-1]+1,r[a-1][i-1]+(e[a-1]!==t[i-1]?1:0));return r[e.length][t.length]}serializeNode(e){const t={};return e.children.forEach(((e,r)=>{t[r]=this.serializeNode(e)})),{isEndOfWord:e.isEndOfWord,documentRefs:Array.from(e.documentRefs),children:t}}deserializeNode(e){const t=new h;return t.isEndOfWord=e.isEndOfWord,t.documentRefs=new Set(e.documentRefs),Object.entries(e.children).forEach((([e,r])=>{t.children.set(e,this.deserializeNode(r))})),t}clear(){this.root=new h,this.documents.clear(),this.documentLinks.clear()}getSize(){return this.documents.size}}class l{constructor(){this.dataMapper=new c,this.trieSearch=new d}indexDocument(e,t,r){r.forEach((r=>{const a=e[r];if("string"==typeof a){this.tokenizeText(a).forEach((e=>{this.trieSearch.insert(e,t),this.dataMapper.mapData(e.toLowerCase(),t)}))}}))}search(e,t={}){const{fuzzy:r=!1,maxResults:a=10}=t,i=this.tokenizeText(e),s=new Map;i.forEach((e=>{(r?this.trieSearch.fuzzySearch(e):this.trieSearch.search(e,a)).forEach((t=>{const r=s.get(t)||{score:0,matches:new Set};r.score+=this.calculateScore(t,e),r.matches.add(e),s.set(t,r)}))}));return Array.from(s.entries()).map((([e,{score:t,matches:r}])=>({item:e,score:t/i.length,matches:Array.from(r)}))).sort(((e,t)=>t.score-e.score)).slice(0,a)}exportState(){return{trie:this.trieSearch.exportState(),dataMap:this.dataMapper.exportState()}}importState(e){if(!e||!e.trie||!e.dataMap)throw new Error("Invalid index state");this.trieSearch=new d,this.trieSearch.importState(e.trie),this.dataMapper=new c,this.dataMapper.importState(e.dataMap)}tokenizeText(e){return e.toLowerCase().replace(/[^\w\s]/g," ").split(/\s+/).filter((e=>e.length>0))}calculateScore(e,t){return this.dataMapper.getDocuments(t.toLowerCase()).has(e)?1:.5}clear(){this.trieSearch=new d,this.dataMapper=new c}}class m{constructor(e){this.config=e,this.indexMapper=new l,this.documents=new Map}async addDocuments(e){e.forEach(((e,t)=>{const r=this.generateDocumentId(t),a={id:r,content:i({content:e.fields,id:""},this.config.fields),metadata:e.metadata};this.documents.set(r,{...e,id:r}),this.indexMapper.indexDocument(a,r,this.config.fields)}))}async search(e,t){return this.indexMapper.search(e,{fuzzy:t.fuzzy,maxResults:t.maxResults}).map((e=>({item:this.documents.get(e.item),score:e.score,matches:e.matches})))}exportIndex(){return{documents:Array.from(this.documents.entries()).map((([e,t])=>({key:e,value:this.serializeDocument(t)}))),indexState:this.indexMapper.exportState(),config:this.config}}importIndex(e){if(!this.isValidIndexData(e))throw new Error("Invalid index data format");try{this.documents=new Map(e.documents.map((e=>[e.key,e.value]))),this.config=e.config,this.indexMapper=new l;const t=e.indexState;if(!(t&&"object"==typeof t&&"trie"in t&&"dataMap"in t))throw new Error("Invalid index state format");this.indexMapper.importState({trie:t.trie,dataMap:t.dataMap})}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to import index: ${t}`)}}clear(){this.documents.clear(),this.indexMapper=new l}generateDocumentId(e){return`${this.config.name}-${e}-${Date.now()}`}isValidIndexData(e){if(!e||"object"!=typeof e)return!1;const t=e;return Boolean(t.documents&&Array.isArray(t.documents)&&void 0!==t.indexState&&t.config&&"object"==typeof t.config)}serializeDocument(e){return JSON.parse(JSON.stringify(e))}}class u{constructor(){this.STOP_WORDS=new Set(["a","an","and","are","as","at","be","by","for","from","has","he","in","is","it","its","of","on","that","the","to","was","were","will","with"])}process(e){const t=this.tokenize(e),r=this.processTokens(t);return this.optimizeQuery(r)}tokenize(e){return e.toLowerCase().split(/\s+/).filter((e=>e.length>0)).map((e=>this.classifyToken(e)))}classifyToken(e){return e.startsWith("+")||e.startsWith("-")?{type:"operator",value:e}:e.includes(":")?{type:"modifier",value:e}:{type:"term",value:e}}processTokens(e){return e.filter((e=>"term"!==e.type||!this.STOP_WORDS.has(e.value))).map((e=>this.normalizeToken(e)))}normalizeToken(e){if("term"===e.type){let t=e.value;return t.endsWith("ing")&&(t=t.slice(0,-3)),t.endsWith("s")&&(t=t.slice(0,-1)),{...e,value:t}}return e}optimizeQuery(e){return e.map((e=>e.value)).join(" ")}}class f{constructor(e){this.isInitialized=!1,this.config=e,this.indexManager=new m(e),this.queryProcessor=new u,this.storage=new a(e.storage),this.cache=new r}async initialize(){if(!this.isInitialized)try{try{await this.storage.initialize()}catch(e){console.warn("Storage initialization failed, falling back to memory storage:",e),this.storage=new a({type:"memory"}),await this.storage.initialize()}await this.loadIndexes(),this.isInitialized=!0}catch(e){const t=e instanceof Error?e.message:String(e);throw new Error(`Failed to initialize search engine: ${t}`)}}async addDocuments(e){this.isInitialized||await this.initialize();try{await this.indexManager.addDocuments(e);try{await this.storage.storeIndex(this.config.name,this.indexManager.exportIndex())}catch(e){console.warn("Failed to persist index, continuing in memory:",e)}this.cache.clear()}catch(e){const t=e instanceof Error?e.message:String(e);throw new Error(`Failed to add documents: ${t}`)}}async search(e,t={}){this.isInitialized||await this.initialize(),o(t);const r=this.generateCacheKey(e,t),a=this.cache.get(r);if(a)return a;try{const a=this.queryProcessor.process(e),i=await this.indexManager.search(a,t);return this.cache.set(r,i),i}catch(e){const t=e instanceof Error?e.message:String(e);throw new Error(`Search failed: ${t}`)}}async loadIndexes(){try{const e=await this.storage.getIndex(this.config.name);e&&this.indexManager.importIndex(e)}catch(e){console.warn("Failed to load stored index, starting fresh:",e)}}generateCacheKey(e,t){return`${this.config.name}-${e}-${JSON.stringify(t)}`}async clearIndex(){try{await this.storage.clearIndices()}catch(e){console.warn("Failed to clear storage, continuing:",e)}this.indexManager.clear(),this.cache.clear()}async close(){try{await this.storage.close(),this.cache.clear(),this.isInitialized=!1}catch(e){console.warn("Error during close:",e)}}}class p extends Error{constructor(e){super(e),this.name="ValidationError"}}class y extends Error{constructor(e){super(e),this.name="StorageError"}}const g={caseSensitive:!1,stemming:!0,stopWords:["the","a","an","and","or","but"],minWordLength:2,maxWordLength:50,fuzzyThreshold:.8},w={fuzzy:!1,maxResults:10,threshold:.5,fields:[],sortBy:"score",sortOrder:"desc",page:1,pageSize:10};class S extends Error{constructor(e){super(e),this.name="SearchError"}}class x extends Error{constructor(e){super(e),this.name="IndexError"}}function E(e){if(!e||"object"!=typeof e)return!1;const t=e;return!(void 0!==t.fuzzy&&"boolean"!=typeof t.fuzzy||void 0!==t.maxResults&&"number"!=typeof t.maxResults)}function b(e){if(!e||"object"!=typeof e)return!1;const t=e;return Boolean("string"==typeof t.name&&"number"==typeof t.version&&Array.isArray(t.fields))}function z(e){if(!e||"object"!=typeof e)return!1;const t=e;return Boolean("item"in t&&"number"==typeof t.score&&Array.isArray(t.matches))}const I={DEFAULT_INDEX_OPTIONS:g,DEFAULT_SEARCH_OPTIONS:w,SearchError:S,IndexError:x,SearchEngine:f,IndexManager:m,QueryProcessor:u,TrieNode:h,TrieSearch:d,isSearchOptions:E,isIndexConfig:b,isSearchResult:z};e.CacheManager=r,e.DEFAULT_INDEX_OPTIONS=g,e.DEFAULT_SEARCH_OPTIONS=w,e.DataMapper=c,e.IndexError=x,e.IndexManager=m,e.IndexMapper=l,e.IndexedDB=class{constructor(){this.db=null,this.DB_NAME="nexus_search_db",this.DB_VERSION=1,this.initPromise=null,this.initPromise=this.initialize()}async initialize(){if(!this.db)try{this.db=await t.openDB(this.DB_NAME,this.DB_VERSION,{upgrade(e,t,r,a){if(!e.objectStoreNames.contains("searchIndices")){e.createObjectStore("searchIndices",{keyPath:"id"}).createIndex("timestamp","timestamp")}if(!e.objectStoreNames.contains("metadata")){e.createObjectStore("metadata",{keyPath:"id"}).createIndex("lastUpdated","lastUpdated")}},blocked(){console.warn("Database upgrade was blocked")},blocking(){console.warn("Current database version is blocking a newer version")},terminated(){console.error("Database connection was terminated")}})}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Storage initialization failed: ${t}`)}}async ensureConnection(){if(this.initPromise&&await this.initPromise,!this.db)throw new Error("Database connection not available")}async storeIndex(e,t){await this.ensureConnection();try{const r={id:e,data:t,timestamp:Date.now()};await this.db.put("searchIndices",r)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to store index: ${t}`)}}async getIndex(e){await this.ensureConnection();try{const t=await this.db.get("searchIndices",e);return(null==t?void 0:t.data)||null}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to retrieve index: ${t}`)}}async updateMetadata(e){await this.ensureConnection();try{const t={id:"config",config:e,lastUpdated:Date.now()};await this.db.put("metadata",t)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to update metadata: ${t}`)}}async getMetadata(){await this.ensureConnection();try{return await this.db.get("metadata","config")||null}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to retrieve metadata: ${t}`)}}async clearIndices(){await this.ensureConnection();try{await this.db.clear("searchIndices")}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to clear indices: ${t}`)}}async deleteIndex(e){await this.ensureConnection();try{await this.db.delete("searchIndices",e)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to delete index: ${t}`)}}async close(){this.db&&(this.db.close(),this.db=null)}},e.NexusSearch=I,e.PerformanceMonitor=class{constructor(){this.metrics=new Map}async measure(e,t){const r=performance.now();try{return await t()}finally{const t=performance.now()-r;this.recordMetric(e,t)}}recordMetric(e,t){this.metrics.has(e)||this.metrics.set(e,[]),this.metrics.get(e).push(t)}getMetrics(){const e={};return this.metrics.forEach(((t,r)=>{e[r]={avg:this.average(t),min:Math.min(...t),max:Math.max(...t),count:t.length}})),e}average(e){return e.reduce(((e,t)=>e+t),0)/e.length}clear(){this.metrics.clear()}},e.QueryProcessor=u,e.SearchEngine=f,e.SearchError=S,e.StorageError=y,e.TrieNode=h,e.TrieSearch=d,e.ValidationError=p,e.createSearchableFields=i,e.default=I,e.getNestedValue=n,e.isIndexConfig=b,e.isSearchOptions=E,e.isSearchResult=z,e.normalizeFieldValue=s,e.optimizeIndex=function(e){const t=Array.from(new Set(e.map((e=>JSON.stringify(e))))).map((e=>JSON.parse(e))).sort(((e,t)=>JSON.stringify(e).localeCompare(JSON.stringify(t))));return{data:t,stats:{originalSize:e.length,optimizedSize:t.length,compressionRatio:t.length/e.length}}},e.validateDocument=function(e,t){return t.every((t=>void 0!==n(e.content,t)))},e.validateIndexConfig=function(e){if(!e.name)throw new Error("Index name is required");if(!e.version||"number"!=typeof e.version)throw new Error("Valid version number is required");if(!Array.isArray(e.fields)||0===e.fields.length)throw new Error("At least one field must be specified for indexing")},e.validateSearchOptions=o,Object.defineProperty(e,"__esModule",{value:!0})}));
//# sourceMappingURL=nexus-search.umd.js.map
