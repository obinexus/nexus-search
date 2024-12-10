/**
 * @obinexuscomputing/nexus-search v0.1.7
 * A high-performance search indexing and query system that uses a trie data structure and BFS/DFS algorithms for fast full-text search with fuzzy matching.
 * @license ISC
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).NexusSearch={})}(this,(function(e){"use strict";class t{constructor(e=1e3,t=5){this.cache=new Map,this.maxSize=e,this.ttl=60*t*1e3}set(e,t){this.cache.size>=this.maxSize&&this.evictOldest(),this.cache.set(e,{data:t,timestamp:Date.now()})}get(e){const t=this.cache.get(e);return t?this.isExpired(t.timestamp)?(this.cache.delete(e),null):t.data:null}isExpired(e){return Date.now()-e>this.ttl}evictOldest(){let e=null,t=1/0;for(const[r,n]of this.cache.entries())n.timestamp<t&&(t=n.timestamp,e=r);e&&this.cache.delete(e)}clear(){this.cache.clear()}}const r=(e,t)=>t.some((t=>e instanceof t));let n,a;const s=new WeakMap,i=new WeakMap,o=new WeakMap;let c={get(e,t,r){if(e instanceof IDBTransaction){if("done"===t)return s.get(e);if("store"===t)return r.objectStoreNames[1]?void 0:r.objectStore(r.objectStoreNames[0])}return u(e[t])},set:(e,t,r)=>(e[t]=r,!0),has:(e,t)=>e instanceof IDBTransaction&&("done"===t||"store"===t)||t in e};function d(e){c=e(c)}function h(e){return(a||(a=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])).includes(e)?function(...t){return e.apply(f(this),t),u(this.request)}:function(...t){return u(e.apply(f(this),t))}}function l(e){return"function"==typeof e?h(e):(e instanceof IDBTransaction&&function(e){if(s.has(e))return;const t=new Promise(((t,r)=>{const n=()=>{e.removeEventListener("complete",a),e.removeEventListener("error",s),e.removeEventListener("abort",s)},a=()=>{t(),n()},s=()=>{r(e.error||new DOMException("AbortError","AbortError")),n()};e.addEventListener("complete",a),e.addEventListener("error",s),e.addEventListener("abort",s)}));s.set(e,t)}(e),r(e,n||(n=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction]))?new Proxy(e,c):e)}function u(e){if(e instanceof IDBRequest)return function(e){const t=new Promise(((t,r)=>{const n=()=>{e.removeEventListener("success",a),e.removeEventListener("error",s)},a=()=>{t(u(e.result)),n()},s=()=>{r(e.error),n()};e.addEventListener("success",a),e.addEventListener("error",s)}));return o.set(t,e),t}(e);if(i.has(e))return i.get(e);const t=l(e);return t!==e&&(i.set(e,t),o.set(t,e)),t}const f=e=>o.get(e);function m(e,t,{blocked:r,upgrade:n,blocking:a,terminated:s}={}){const i=indexedDB.open(e,t),o=u(i);return n&&i.addEventListener("upgradeneeded",(e=>{n(u(i.result),e.oldVersion,e.newVersion,u(i.transaction),e)})),r&&i.addEventListener("blocked",(e=>r(e.oldVersion,e.newVersion,e))),o.then((e=>{s&&e.addEventListener("close",(()=>s())),a&&e.addEventListener("versionchange",(e=>a(e.oldVersion,e.newVersion,e)))})).catch((()=>{})),o}const p=["get","getKey","getAll","getAllKeys","count"],w=["put","add","delete","clear"],g=new Map;function y(e,t){if(!(e instanceof IDBDatabase)||t in e||"string"!=typeof t)return;if(g.get(t))return g.get(t);const r=t.replace(/FromIndex$/,""),n=t!==r,a=w.includes(r);if(!(r in(n?IDBIndex:IDBObjectStore).prototype)||!a&&!p.includes(r))return;const s=async function(e,...t){const s=this.transaction(e,a?"readwrite":"readonly");let i=s.store;return n&&(i=i.index(t.shift())),(await Promise.all([i[r](...t),a&&s.done]))[0]};return g.set(t,s),s}d((e=>({...e,get:(t,r,n)=>y(t,r)||e.get(t,r,n),has:(t,r)=>!!y(t,r)||e.has(t,r)})));const E=["continue","continuePrimaryKey","advance"],x={},S=new WeakMap,b=new WeakMap,I={get(e,t){if(!E.includes(t))return e[t];let r=x[t];return r||(r=x[t]=function(...e){S.set(this,b.get(this)[t](...e))}),r}};async function*D(...e){let t=this;if(t instanceof IDBCursor||(t=await t.openCursor(...e)),!t)return;const r=new Proxy(t,I);for(b.set(r,t),o.set(r,f(t));t;)yield r,t=await(S.get(r)||t.continue()),S.delete(r)}function M(e,t){return t===Symbol.asyncIterator&&r(e,[IDBIndex,IDBObjectStore,IDBCursor])||"iterate"===t&&r(e,[IDBIndex,IDBObjectStore])}d((e=>({...e,get:(t,r,n)=>M(t,r)?D:e.get(t,r,n),has:(t,r)=>M(t,r)||e.has(t,r)})));class v{constructor(){this.db=null,this.DB_NAME="nexus_search_db",this.DB_VERSION=1,this.initPromise=null,this.initPromise=this.initialize()}async initialize(){if(!this.db)try{this.db=await m(this.DB_NAME,this.DB_VERSION,{upgrade(e,t,r,n){if(!e.objectStoreNames.contains("searchIndices")){e.createObjectStore("searchIndices",{keyPath:"id"}).createIndex("timestamp","timestamp")}if(!e.objectStoreNames.contains("metadata")){e.createObjectStore("metadata",{keyPath:"id"}).createIndex("lastUpdated","lastUpdated")}},blocked(){console.warn("Database upgrade was blocked")},blocking(){console.warn("Current database version is blocking a newer version")},terminated(){console.error("Database connection was terminated")}})}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Storage initialization failed: ${t}`)}}async ensureConnection(){if(this.initPromise&&await this.initPromise,!this.db)throw new Error("Database connection not available")}async storeIndex(e,t){await this.ensureConnection();try{const r={id:e,data:t,timestamp:Date.now()};await this.db.put("searchIndices",r)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to store index: ${t}`)}}async getIndex(e){await this.ensureConnection();try{const t=await this.db.get("searchIndices",e);return(null==t?void 0:t.data)||null}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to retrieve index: ${t}`)}}async updateMetadata(e){await this.ensureConnection();try{const t={id:"config",config:e,lastUpdated:Date.now()};await this.db.put("metadata",t)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to update metadata: ${t}`)}}async getMetadata(){await this.ensureConnection();try{return await this.db.get("metadata","config")||null}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to retrieve metadata: ${t}`)}}async clearIndices(){await this.ensureConnection();try{await this.db.clear("searchIndices")}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to clear indices: ${t}`)}}async close(){this.db&&(this.db.close(),this.db=null)}}function z(e,t){const r={};return t.forEach((t=>{const n=O(e.content,t);void 0!==n&&(r[t]=k(n))})),r}function k(e){return"string"==typeof e?e.toLowerCase().trim():Array.isArray(e)?e.map((e=>k(e))).join(" "):"object"==typeof e&&null!==e?Object.values(e).map((e=>k(e))).join(" "):String(e)}function O(e,t){const r=t.split(".");let n=e;for(const e of r){if(!n||"object"!=typeof n||Array.isArray(n)||!(e in n))return;n=n[e]}return n}function A(e){if(e.maxResults&&e.maxResults<1)throw new Error("maxResults must be greater than 0");if(e.threshold&&(e.threshold<0||e.threshold>1))throw new Error("threshold must be between 0 and 1");if(e.fields&&!Array.isArray(e.fields))throw new Error("fields must be an array")}class C{constructor(){this.dataMap=new Map}mapData(e,t){this.dataMap.has(e)||this.dataMap.set(e,new Set),this.dataMap.get(e).add(t)}getDocuments(e){return this.dataMap.get(e)||new Set}getAllKeys(){return Array.from(this.dataMap.keys())}exportState(){const e={};return this.dataMap.forEach(((t,r)=>{e[r]=Array.from(t)})),e}importState(e){this.dataMap.clear(),Object.entries(e).forEach((([e,t])=>{this.dataMap.set(e,new Set(t))}))}clear(){this.dataMap.clear()}}class N{constructor(){this.children=new Map,this.isEndOfWord=!1,this.documentRefs=new Set,this.weight=0}}class L{constructor(){this.root=new N,this.documents=new Map,this.documentLinks=new Map}exportState(){return{trie:this.serializeNode(this.root),documents:Array.from(this.documents.entries()),documentLinks:Array.from(this.documentLinks.entries())}}importState(e){this.root=this.deserializeNode(e.trie),e.documents&&(this.documents=new Map(e.documents)),e.documentLinks&&(this.documentLinks=new Map(e.documentLinks))}insert(e,t){let r=this.root;for(const t of e.toLowerCase())r.children.has(t)||r.children.set(t,new N),r=r.children.get(t);r.isEndOfWord=!0,r.documentRefs.add(t)}search(e,t=10){const r=new Set;let n=this.root;for(const t of e.toLowerCase()){if(!n.children.has(t))return r;n=n.children.get(t)}return this.collectDocumentRefs(n,r,t),r}fuzzySearch(e,t=2){const r=new Set;return this.fuzzySearchHelper(e.toLowerCase(),this.root,"",t,r),r}collectDocumentRefs(e,t,r){if(e.isEndOfWord)for(const n of e.documentRefs){if(t.size>=r)return;t.add(n)}for(const n of e.children.values()){if(t.size>=r)return;this.collectDocumentRefs(n,t,r)}}fuzzySearchHelper(e,t,r,n,a){if(!(n<0)){if(t.isEndOfWord){this.calculateLevenshteinDistance(e,r)<=n&&t.documentRefs.forEach((e=>a.add(e)))}if(n>0)for(const[s,i]of t.children){const t=e[r.length]!==s?n-1:n;this.fuzzySearchHelper(e,i,r+s,t,a)}}}calculateLevenshteinDistance(e,t){const r=Array(e.length+1).fill(0).map((()=>Array(t.length+1).fill(0)));for(let t=0;t<=e.length;t++)r[t][0]=t;for(let e=0;e<=t.length;e++)r[0][e]=e;for(let n=1;n<=e.length;n++)for(let a=1;a<=t.length;a++)r[n][a]=Math.min(r[n-1][a]+1,r[n][a-1]+1,r[n-1][a-1]+(e[n-1]!==t[a-1]?1:0));return r[e.length][t.length]}serializeNode(e){const t={};return e.children.forEach(((e,r)=>{t[r]=this.serializeNode(e)})),{isEndOfWord:e.isEndOfWord,documentRefs:Array.from(e.documentRefs),children:t}}deserializeNode(e){const t=new N;return t.isEndOfWord=e.isEndOfWord,t.documentRefs=new Set(e.documentRefs),Object.entries(e.children).forEach((([e,r])=>{t.children.set(e,this.deserializeNode(r))})),t}clear(){this.root=new N,this.documents.clear(),this.documentLinks.clear()}getSize(){return this.documents.size}}class B{constructor(){this.dataMapper=new C,this.trieSearch=new L}indexDocument(e,t,r){r.forEach((r=>{const n=e[r];if("string"==typeof n){this.tokenizeText(n).forEach((e=>{this.trieSearch.insert(e,t),this.dataMapper.mapData(e.toLowerCase(),t)}))}}))}search(e,t={}){const{fuzzy:r=!1,maxResults:n=10}=t,a=this.tokenizeText(e),s=new Map;a.forEach((e=>{(r?this.trieSearch.fuzzySearch(e):this.trieSearch.search(e,n)).forEach((t=>{const r=s.get(t)||{score:0,matches:new Set};r.score+=this.calculateScore(t,e),r.matches.add(e),s.set(t,r)}))}));return Array.from(s.entries()).map((([e,{score:t,matches:r}])=>({item:e,score:t/a.length,matches:Array.from(r)}))).sort(((e,t)=>t.score-e.score)).slice(0,n)}exportState(){return{trie:this.trieSearch.exportState(),dataMap:this.dataMapper.exportState()}}importState(e){if(!e||!e.trie||!e.dataMap)throw new Error("Invalid index state");this.trieSearch=new L,this.trieSearch.importState(e.trie),this.dataMapper=new C,this.dataMapper.importState(e.dataMap)}tokenizeText(e){return e.toLowerCase().replace(/[^\w\s]/g," ").split(/\s+/).filter((e=>e.length>0))}calculateScore(e,t){return this.dataMapper.getDocuments(t.toLowerCase()).has(e)?1:.5}clear(){this.trieSearch=new L,this.dataMapper=new C}}class R{constructor(e){this.config=e,this.indexMapper=new B,this.documents=new Map}async addDocuments(e){e.forEach(((e,t)=>{const r=this.generateDocumentId(t),n={id:r,content:z({content:e.fields,id:""},this.config.fields),metadata:e.metadata};this.documents.set(r,{...e,id:r}),this.indexMapper.indexDocument(n,r,this.config.fields)}))}async search(e,t){return this.indexMapper.search(e,{fuzzy:t.fuzzy,maxResults:t.maxResults}).map((e=>({item:this.documents.get(e.item),score:e.score,matches:e.matches})))}exportIndex(){return{documents:Array.from(this.documents.entries()).map((([e,t])=>({key:e,value:this.serializeDocument(t)}))),indexState:this.indexMapper.exportState(),config:this.config}}importIndex(e){if(!this.isValidIndexData(e))throw new Error("Invalid index data format");try{this.documents=new Map(e.documents.map((e=>[e.key,e.value]))),this.config=e.config,this.indexMapper=new B;const t=e.indexState;if(!(t&&"object"==typeof t&&"trie"in t&&"dataMap"in t))throw new Error("Invalid index state format");this.indexMapper.importState({trie:t.trie,dataMap:t.dataMap})}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to import index: ${t}`)}}clear(){this.documents.clear(),this.indexMapper=new B}generateDocumentId(e){return`${this.config.name}-${e}-${Date.now()}`}isValidIndexData(e){if(!e||"object"!=typeof e)return!1;const t=e;return Boolean(t.documents&&Array.isArray(t.documents)&&void 0!==t.indexState&&t.config&&"object"==typeof t.config)}serializeDocument(e){return JSON.parse(JSON.stringify(e))}}class j{constructor(){this.STOP_WORDS=new Set(["a","an","and","are","as","at","be","by","for","from","has","he","in","is","it","its","of","on","that","the","to","was","were","will","with"])}process(e){const t=this.tokenize(e),r=this.processTokens(t);return this.optimizeQuery(r)}tokenize(e){return e.toLowerCase().split(/\s+/).filter((e=>e.length>0)).map((e=>this.classifyToken(e)))}classifyToken(e){return e.startsWith("+")||e.startsWith("-")?{type:"operator",value:e}:e.includes(":")?{type:"modifier",value:e}:{type:"term",value:e}}processTokens(e){return e.filter((e=>"term"!==e.type||!this.STOP_WORDS.has(e.value))).map((e=>this.normalizeToken(e)))}normalizeToken(e){if("term"===e.type){let t=e.value;return t.endsWith("ing")&&(t=t.slice(0,-3)),t.endsWith("s")&&(t=t.slice(0,-1)),{...e,value:t}}return e}optimizeQuery(e){return e.map((e=>e.value)).join(" ")}}class P{constructor(e){this.config=e,this.indexManager=new R(e),this.queryProcessor=new j,this.storage=new v,this.cache=new t}async initialize(){try{await this.storage.initialize(),await this.loadIndexes()}catch(e){throw new Error(`Failed to initialize search engine: ${e}`)}}async addDocuments(e){try{await this.indexManager.addDocuments(e),await this.storage.storeIndex(this.config.name,this.indexManager.exportIndex())}catch(e){throw new Error(`Failed to add documents: ${e}`)}}async search(e,t={}){A(t);const r=this.generateCacheKey(e,t),n=this.cache.get(r);if(n)return n;const a=this.queryProcessor.process(e),s=await this.indexManager.search(a,t);return this.cache.set(r,s),s}async loadIndexes(){const e=await this.storage.getIndex(this.config.name);e&&this.indexManager.importIndex(e)}generateCacheKey(e,t){return`${e}-${JSON.stringify(t)}`}async clearIndex(){await this.storage.clearIndices(),this.indexManager.clear(),this.cache.clear()}}class T extends Error{constructor(e){super(e),this.name="ValidationError"}}class U extends Error{constructor(e){super(e),this.name="StorageError"}}const _={caseSensitive:!1,stemming:!0,stopWords:["the","a","an","and","or","but"],minWordLength:2,maxWordLength:50,fuzzyThreshold:.8},W={fuzzy:!1,maxResults:10,threshold:.5,fields:[],sortBy:"score",sortOrder:"desc",page:1,pageSize:10};class $ extends Error{constructor(e){super(e),this.name="SearchError"}}class F extends Error{constructor(e){super(e),this.name="IndexError"}}function V(e){if(!e||"object"!=typeof e)return!1;const t=e;return!(void 0!==t.fuzzy&&"boolean"!=typeof t.fuzzy||void 0!==t.maxResults&&"number"!=typeof t.maxResults)}function J(e){if(!e||"object"!=typeof e)return!1;const t=e;return Boolean("string"==typeof t.name&&"number"==typeof t.version&&Array.isArray(t.fields))}function K(e){if(!e||"object"!=typeof e)return!1;const t=e;return Boolean("item"in t&&"number"==typeof t.score&&Array.isArray(t.matches))}const q={DEFAULT_INDEX_OPTIONS:_,DEFAULT_SEARCH_OPTIONS:W,SearchError:$,IndexError:F,SearchEngine:P,IndexManager:R,QueryProcessor:j,TrieNode:N,TrieSearch:L,isSearchOptions:V,isIndexConfig:J,isSearchResult:K};e.CacheManager=t,e.DEFAULT_INDEX_OPTIONS=_,e.DEFAULT_SEARCH_OPTIONS=W,e.DataMapper=C,e.IndexError=F,e.IndexManager=R,e.IndexMapper=B,e.IndexedDB=class{constructor(){this.db=null,this.DB_NAME="nexus_search_db",this.DB_VERSION=1,this.initPromise=null,this.initPromise=this.initialize()}async initialize(){if(!this.db)try{this.db=await m(this.DB_NAME,this.DB_VERSION,{upgrade(e,t,r,n){if(!e.objectStoreNames.contains("searchIndices")){e.createObjectStore("searchIndices",{keyPath:"id"}).createIndex("timestamp","timestamp")}if(!e.objectStoreNames.contains("metadata")){e.createObjectStore("metadata",{keyPath:"id"}).createIndex("lastUpdated","lastUpdated")}},blocked(){console.warn("Database upgrade was blocked")},blocking(){console.warn("Current database version is blocking a newer version")},terminated(){console.error("Database connection was terminated")}})}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Storage initialization failed: ${t}`)}}async ensureConnection(){if(this.initPromise&&await this.initPromise,!this.db)throw new Error("Database connection not available")}async storeIndex(e,t){await this.ensureConnection();try{const r={id:e,data:t,timestamp:Date.now()};await this.db.put("searchIndices",r)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to store index: ${t}`)}}async getIndex(e){await this.ensureConnection();try{const t=await this.db.get("searchIndices",e);return(null==t?void 0:t.data)||null}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to retrieve index: ${t}`)}}async updateMetadata(e){await this.ensureConnection();try{const t={id:"config",config:e,lastUpdated:Date.now()};await this.db.put("metadata",t)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to update metadata: ${t}`)}}async getMetadata(){await this.ensureConnection();try{return await this.db.get("metadata","config")||null}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to retrieve metadata: ${t}`)}}async clearIndices(){await this.ensureConnection();try{await this.db.clear("searchIndices")}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to clear indices: ${t}`)}}async deleteIndex(e){await this.ensureConnection();try{await this.db.delete("searchIndices",e)}catch(e){const t=e instanceof Error?e.message:"Unknown error";throw new Error(`Failed to delete index: ${t}`)}}async close(){this.db&&(this.db.close(),this.db=null)}},e.NexusSearch=q,e.PerformanceMonitor=class{constructor(){this.metrics=new Map}async measure(e,t){const r=performance.now();try{return await t()}finally{const t=performance.now()-r;this.recordMetric(e,t)}}recordMetric(e,t){this.metrics.has(e)||this.metrics.set(e,[]),this.metrics.get(e).push(t)}getMetrics(){const e={};return this.metrics.forEach(((t,r)=>{e[r]={avg:this.average(t),min:Math.min(...t),max:Math.max(...t),count:t.length}})),e}average(e){return e.reduce(((e,t)=>e+t),0)/e.length}clear(){this.metrics.clear()}},e.QueryProcessor=j,e.SearchEngine=P,e.SearchError=$,e.StorageError=U,e.TrieNode=N,e.TrieSearch=L,e.ValidationError=T,e.createSearchableFields=z,e.default=q,e.getNestedValue=O,e.isIndexConfig=J,e.isSearchOptions=V,e.isSearchResult=K,e.normalizeFieldValue=k,e.optimizeIndex=function(e){const t=Array.from(new Set(e.map((e=>JSON.stringify(e))))).map((e=>JSON.parse(e))).sort(((e,t)=>JSON.stringify(e).localeCompare(JSON.stringify(t))));return{data:t,stats:{originalSize:e.length,optimizedSize:t.length,compressionRatio:t.length/e.length}}},e.validateDocument=function(e,t){return t.every((t=>void 0!==O(e.content,t)))},e.validateIndexConfig=function(e){if(!e.name)throw new Error("Index name is required");if(!e.version||"number"!=typeof e.version)throw new Error("Valid version number is required");if(!Array.isArray(e.fields)||0===e.fields.length)throw new Error("At least one field must be specified for indexing")},e.validateSearchOptions=A,Object.defineProperty(e,"__esModule",{value:!0})}));
//# sourceMappingURL=nexus-search.umd.js.map
