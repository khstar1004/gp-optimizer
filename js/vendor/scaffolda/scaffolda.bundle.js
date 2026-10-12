// Scaffolda 원본 번들 — 생성물. 직접 수정하지 말 것.
// 원본: Scaffolda-public/src/features/scaffolda/lib/**  (npm run build:scaffolda)

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// node_modules/martinez-polygon-clipping/dist/martinez.umd.js
var require_martinez_umd = __commonJS({
  "node_modules/martinez-polygon-clipping/dist/martinez.umd.js"(exports, module) {
    (function(global, factory) {
      typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = global || self, factory(global.martinez = {}));
    })(exports, (function(exports2) {
      "use strict";
      function DEFAULT_COMPARE(a, b) {
        return a > b ? 1 : a < b ? -1 : 0;
      }
      var SplayTree = function SplayTree2(compare, noDuplicates) {
        if (compare === void 0) compare = DEFAULT_COMPARE;
        if (noDuplicates === void 0) noDuplicates = false;
        this._compare = compare;
        this._root = null;
        this._size = 0;
        this._noDuplicates = !!noDuplicates;
      };
      var prototypeAccessors = { size: { configurable: true } };
      SplayTree.prototype.rotateLeft = function rotateLeft(x) {
        var y = x.right;
        if (y) {
          x.right = y.left;
          if (y.left) {
            y.left.parent = x;
          }
          y.parent = x.parent;
        }
        if (!x.parent) {
          this._root = y;
        } else if (x === x.parent.left) {
          x.parent.left = y;
        } else {
          x.parent.right = y;
        }
        if (y) {
          y.left = x;
        }
        x.parent = y;
      };
      SplayTree.prototype.rotateRight = function rotateRight(x) {
        var y = x.left;
        if (y) {
          x.left = y.right;
          if (y.right) {
            y.right.parent = x;
          }
          y.parent = x.parent;
        }
        if (!x.parent) {
          this._root = y;
        } else if (x === x.parent.left) {
          x.parent.left = y;
        } else {
          x.parent.right = y;
        }
        if (y) {
          y.right = x;
        }
        x.parent = y;
      };
      SplayTree.prototype._splay = function _splay(x) {
        while (x.parent) {
          var p = x.parent;
          if (!p.parent) {
            if (p.left === x) {
              this.rotateRight(p);
            } else {
              this.rotateLeft(p);
            }
          } else if (p.left === x && p.parent.left === p) {
            this.rotateRight(p.parent);
            this.rotateRight(p);
          } else if (p.right === x && p.parent.right === p) {
            this.rotateLeft(p.parent);
            this.rotateLeft(p);
          } else if (p.left === x && p.parent.right === p) {
            this.rotateRight(p);
            this.rotateLeft(p);
          } else {
            this.rotateLeft(p);
            this.rotateRight(p);
          }
        }
      };
      SplayTree.prototype.splay = function splay(x) {
        var p, gp, ggp, l, r;
        while (x.parent) {
          p = x.parent;
          gp = p.parent;
          if (gp && gp.parent) {
            ggp = gp.parent;
            if (ggp.left === gp) {
              ggp.left = x;
            } else {
              ggp.right = x;
            }
            x.parent = ggp;
          } else {
            x.parent = null;
            this._root = x;
          }
          l = x.left;
          r = x.right;
          if (x === p.left) {
            if (gp) {
              if (gp.left === p) {
                if (p.right) {
                  gp.left = p.right;
                  gp.left.parent = gp;
                } else {
                  gp.left = null;
                }
                p.right = gp;
                gp.parent = p;
              } else {
                if (l) {
                  gp.right = l;
                  l.parent = gp;
                } else {
                  gp.right = null;
                }
                x.left = gp;
                gp.parent = x;
              }
            }
            if (r) {
              p.left = r;
              r.parent = p;
            } else {
              p.left = null;
            }
            x.right = p;
            p.parent = x;
          } else {
            if (gp) {
              if (gp.right === p) {
                if (p.left) {
                  gp.right = p.left;
                  gp.right.parent = gp;
                } else {
                  gp.right = null;
                }
                p.left = gp;
                gp.parent = p;
              } else {
                if (r) {
                  gp.left = r;
                  r.parent = gp;
                } else {
                  gp.left = null;
                }
                x.right = gp;
                gp.parent = x;
              }
            }
            if (l) {
              p.right = l;
              l.parent = p;
            } else {
              p.right = null;
            }
            x.left = p;
            p.parent = x;
          }
        }
      };
      SplayTree.prototype.replace = function replace(u5, v2) {
        if (!u5.parent) {
          this._root = v2;
        } else if (u5 === u5.parent.left) {
          u5.parent.left = v2;
        } else {
          u5.parent.right = v2;
        }
        if (v2) {
          v2.parent = u5.parent;
        }
      };
      SplayTree.prototype.minNode = function minNode(u5) {
        if (u5 === void 0) u5 = this._root;
        if (u5) {
          while (u5.left) {
            u5 = u5.left;
          }
        }
        return u5;
      };
      SplayTree.prototype.maxNode = function maxNode(u5) {
        if (u5 === void 0) u5 = this._root;
        if (u5) {
          while (u5.right) {
            u5 = u5.right;
          }
        }
        return u5;
      };
      SplayTree.prototype.insert = function insert(key, data) {
        var z = this._root;
        var p = null;
        var comp = this._compare;
        var cmp;
        if (this._noDuplicates) {
          while (z) {
            p = z;
            cmp = comp(z.key, key);
            if (cmp === 0) {
              return;
            } else if (comp(z.key, key) < 0) {
              z = z.right;
            } else {
              z = z.left;
            }
          }
        } else {
          while (z) {
            p = z;
            if (comp(z.key, key) < 0) {
              z = z.right;
            } else {
              z = z.left;
            }
          }
        }
        z = { key, data, left: null, right: null, parent: p };
        if (!p) {
          this._root = z;
        } else if (comp(p.key, z.key) < 0) {
          p.right = z;
        } else {
          p.left = z;
        }
        this.splay(z);
        this._size++;
        return z;
      };
      SplayTree.prototype.find = function find(key) {
        var z = this._root;
        var comp = this._compare;
        while (z) {
          var cmp = comp(z.key, key);
          if (cmp < 0) {
            z = z.right;
          } else if (cmp > 0) {
            z = z.left;
          } else {
            return z;
          }
        }
        return null;
      };
      SplayTree.prototype.contains = function contains(key) {
        var node = this._root;
        var comparator = this._compare;
        while (node) {
          var cmp = comparator(key, node.key);
          if (cmp === 0) {
            return true;
          } else if (cmp < 0) {
            node = node.left;
          } else {
            node = node.right;
          }
        }
        return false;
      };
      SplayTree.prototype.remove = function remove(key) {
        var z = this.find(key);
        if (!z) {
          return false;
        }
        this.splay(z);
        if (!z.left) {
          this.replace(z, z.right);
        } else if (!z.right) {
          this.replace(z, z.left);
        } else {
          var y = this.minNode(z.right);
          if (y.parent !== z) {
            this.replace(y, y.right);
            y.right = z.right;
            y.right.parent = y;
          }
          this.replace(z, y);
          y.left = z.left;
          y.left.parent = y;
        }
        this._size--;
        return true;
      };
      SplayTree.prototype.removeNode = function removeNode(z) {
        if (!z) {
          return false;
        }
        this.splay(z);
        if (!z.left) {
          this.replace(z, z.right);
        } else if (!z.right) {
          this.replace(z, z.left);
        } else {
          var y = this.minNode(z.right);
          if (y.parent !== z) {
            this.replace(y, y.right);
            y.right = z.right;
            y.right.parent = y;
          }
          this.replace(z, y);
          y.left = z.left;
          y.left.parent = y;
        }
        this._size--;
        return true;
      };
      SplayTree.prototype.erase = function erase(key) {
        var z = this.find(key);
        if (!z) {
          return;
        }
        this.splay(z);
        var s = z.left;
        var t = z.right;
        var sMax = null;
        if (s) {
          s.parent = null;
          sMax = this.maxNode(s);
          this.splay(sMax);
          this._root = sMax;
        }
        if (t) {
          if (s) {
            sMax.right = t;
          } else {
            this._root = t;
          }
          t.parent = sMax;
        }
        this._size--;
      };
      SplayTree.prototype.pop = function pop() {
        var node = this._root, returnValue = null;
        if (node) {
          while (node.left) {
            node = node.left;
          }
          returnValue = { key: node.key, data: node.data };
          this.remove(node.key);
        }
        return returnValue;
      };
      SplayTree.prototype.next = function next(node) {
        var successor = node;
        if (successor) {
          if (successor.right) {
            successor = successor.right;
            while (successor && successor.left) {
              successor = successor.left;
            }
          } else {
            successor = node.parent;
            while (successor && successor.right === node) {
              node = successor;
              successor = successor.parent;
            }
          }
        }
        return successor;
      };
      SplayTree.prototype.prev = function prev(node) {
        var predecessor = node;
        if (predecessor) {
          if (predecessor.left) {
            predecessor = predecessor.left;
            while (predecessor && predecessor.right) {
              predecessor = predecessor.right;
            }
          } else {
            predecessor = node.parent;
            while (predecessor && predecessor.left === node) {
              node = predecessor;
              predecessor = predecessor.parent;
            }
          }
        }
        return predecessor;
      };
      SplayTree.prototype.forEach = function forEach(callback) {
        var current = this._root;
        var s = [], done = false, i = 0;
        while (!done) {
          if (current) {
            s.push(current);
            current = current.left;
          } else {
            if (s.length > 0) {
              current = s.pop();
              callback(current, i++);
              current = current.right;
            } else {
              done = true;
            }
          }
        }
        return this;
      };
      SplayTree.prototype.range = function range(low, high, fn, ctx) {
        var Q = [];
        var compare = this._compare;
        var node = this._root, cmp;
        while (Q.length !== 0 || node) {
          if (node) {
            Q.push(node);
            node = node.left;
          } else {
            node = Q.pop();
            cmp = compare(node.key, high);
            if (cmp > 0) {
              break;
            } else if (compare(node.key, low) >= 0) {
              if (fn.call(ctx, node)) {
                return this;
              }
            }
            node = node.right;
          }
        }
        return this;
      };
      SplayTree.prototype.keys = function keys() {
        var current = this._root;
        var s = [], r = [], done = false;
        while (!done) {
          if (current) {
            s.push(current);
            current = current.left;
          } else {
            if (s.length > 0) {
              current = s.pop();
              r.push(current.key);
              current = current.right;
            } else {
              done = true;
            }
          }
        }
        return r;
      };
      SplayTree.prototype.values = function values() {
        var current = this._root;
        var s = [], r = [], done = false;
        while (!done) {
          if (current) {
            s.push(current);
            current = current.left;
          } else {
            if (s.length > 0) {
              current = s.pop();
              r.push(current.data);
              current = current.right;
            } else {
              done = true;
            }
          }
        }
        return r;
      };
      SplayTree.prototype.at = function at(index) {
        var current = this._root;
        var s = [], done = false, i = 0;
        while (!done) {
          if (current) {
            s.push(current);
            current = current.left;
          } else {
            if (s.length > 0) {
              current = s.pop();
              if (i === index) {
                return current;
              }
              i++;
              current = current.right;
            } else {
              done = true;
            }
          }
        }
        return null;
      };
      SplayTree.prototype.load = function load(keys, values, presort) {
        if (keys === void 0) keys = [];
        if (values === void 0) values = [];
        if (presort === void 0) presort = false;
        if (this._size !== 0) {
          throw new Error("bulk-load: tree is not empty");
        }
        var size = keys.length;
        if (presort) {
          sort(keys, values, 0, size - 1, this._compare);
        }
        this._root = loadRecursive(null, keys, values, 0, size);
        this._size = size;
        return this;
      };
      SplayTree.prototype.min = function min2() {
        var node = this.minNode(this._root);
        if (node) {
          return node.key;
        } else {
          return null;
        }
      };
      SplayTree.prototype.max = function max2() {
        var node = this.maxNode(this._root);
        if (node) {
          return node.key;
        } else {
          return null;
        }
      };
      SplayTree.prototype.isEmpty = function isEmpty() {
        return this._root === null;
      };
      prototypeAccessors.size.get = function() {
        return this._size;
      };
      SplayTree.createTree = function createTree(keys, values, comparator, presort, noDuplicates) {
        return new SplayTree(comparator, noDuplicates).load(keys, values, presort);
      };
      Object.defineProperties(SplayTree.prototype, prototypeAccessors);
      function loadRecursive(parent, keys, values, start, end) {
        var size = end - start;
        if (size > 0) {
          var middle = start + Math.floor(size / 2);
          var key = keys[middle];
          var data = values[middle];
          var node = { key, data, parent };
          node.left = loadRecursive(node, keys, values, start, middle);
          node.right = loadRecursive(node, keys, values, middle + 1, end);
          return node;
        }
        return null;
      }
      function sort(keys, values, left, right, compare) {
        if (left >= right) {
          return;
        }
        var pivot = keys[left + right >> 1];
        var i = left - 1;
        var j = right + 1;
        while (true) {
          do {
            i++;
          } while (compare(keys[i], pivot) < 0);
          do {
            j--;
          } while (compare(keys[j], pivot) > 0);
          if (i >= j) {
            break;
          }
          var tmp = keys[i];
          keys[i] = keys[j];
          keys[j] = tmp;
          tmp = values[i];
          values[i] = values[j];
          values[j] = tmp;
        }
        sort(keys, values, left, j, compare);
        sort(keys, values, j + 1, right, compare);
      }
      var NORMAL = 0;
      var NON_CONTRIBUTING = 1;
      var SAME_TRANSITION = 2;
      var DIFFERENT_TRANSITION = 3;
      var INTERSECTION = 0;
      var UNION = 1;
      var DIFFERENCE = 2;
      var XOR = 3;
      function computeFields(event, prev, operation) {
        if (prev === null) {
          event.inOut = false;
          event.otherInOut = true;
        } else {
          if (event.isSubject === prev.isSubject) {
            event.inOut = !prev.inOut;
            event.otherInOut = prev.otherInOut;
          } else {
            event.inOut = !prev.otherInOut;
            event.otherInOut = prev.isVertical() ? !prev.inOut : prev.inOut;
          }
          if (prev) {
            event.prevInResult = !inResult(prev, operation) || prev.isVertical() ? prev.prevInResult : prev;
          }
        }
        var isInResult = inResult(event, operation);
        if (isInResult) {
          event.resultTransition = determineResultTransition(event, operation);
        } else {
          event.resultTransition = 0;
        }
      }
      function inResult(event, operation) {
        switch (event.type) {
          case NORMAL:
            switch (operation) {
              case INTERSECTION:
                return !event.otherInOut;
              case UNION:
                return event.otherInOut;
              case DIFFERENCE:
                return event.isSubject && event.otherInOut || !event.isSubject && !event.otherInOut;
              case XOR:
                return true;
            }
            break;
          case SAME_TRANSITION:
            return operation === INTERSECTION || operation === UNION;
          case DIFFERENT_TRANSITION:
            return operation === DIFFERENCE;
          case NON_CONTRIBUTING:
            return false;
        }
        return false;
      }
      function determineResultTransition(event, operation) {
        var thisIn = !event.inOut;
        var thatIn = !event.otherInOut;
        var isIn;
        switch (operation) {
          case INTERSECTION:
            isIn = thisIn && thatIn;
            break;
          case UNION:
            isIn = thisIn || thatIn;
            break;
          case XOR:
            isIn = thisIn ^ thatIn;
            break;
          case DIFFERENCE:
            if (event.isSubject) {
              isIn = thisIn && !thatIn;
            } else {
              isIn = thatIn && !thisIn;
            }
            break;
        }
        return isIn ? 1 : -1;
      }
      var SweepEvent = function SweepEvent2(point, left, otherEvent, isSubject, edgeType) {
        this.left = left;
        this.point = point;
        this.otherEvent = otherEvent;
        this.isSubject = isSubject;
        this.type = edgeType || NORMAL;
        this.inOut = false;
        this.otherInOut = false;
        this.prevInResult = null;
        this.resultTransition = 0;
        this.otherPos = -1;
        this.outputContourId = -1;
        this.isExteriorRing = true;
      };
      var prototypeAccessors$1 = { inResult: { configurable: true } };
      SweepEvent.prototype.isBelow = function isBelow(p) {
        var p0 = this.point, p1 = this.otherEvent.point;
        return this.left ? (p0[0] - p[0]) * (p1[1] - p[1]) - (p1[0] - p[0]) * (p0[1] - p[1]) > 0 : (p1[0] - p[0]) * (p0[1] - p[1]) - (p0[0] - p[0]) * (p1[1] - p[1]) > 0;
      };
      SweepEvent.prototype.isAbove = function isAbove(p) {
        return !this.isBelow(p);
      };
      SweepEvent.prototype.isVertical = function isVertical() {
        return this.point[0] === this.otherEvent.point[0];
      };
      prototypeAccessors$1.inResult.get = function() {
        return this.resultTransition !== 0;
      };
      SweepEvent.prototype.clone = function clone() {
        var copy = new SweepEvent(
          this.point,
          this.left,
          this.otherEvent,
          this.isSubject,
          this.type
        );
        copy.contourId = this.contourId;
        copy.resultTransition = this.resultTransition;
        copy.prevInResult = this.prevInResult;
        copy.isExteriorRing = this.isExteriorRing;
        copy.inOut = this.inOut;
        copy.otherInOut = this.otherInOut;
        return copy;
      };
      Object.defineProperties(SweepEvent.prototype, prototypeAccessors$1);
      function equals(p1, p2) {
        if (p1[0] === p2[0]) {
          if (p1[1] === p2[1]) {
            return true;
          } else {
            return false;
          }
        }
        return false;
      }
      var epsilon2 = 11102230246251565e-32;
      var splitter2 = 134217729;
      var resulterrbound2 = (3 + 8 * epsilon2) * epsilon2;
      function sum2(elen, e, flen, f, h) {
        var Q, Qnew, hh, bvirt;
        var enow = e[0];
        var fnow = f[0];
        var eindex = 0;
        var findex = 0;
        if (fnow > enow === fnow > -enow) {
          Q = enow;
          enow = e[++eindex];
        } else {
          Q = fnow;
          fnow = f[++findex];
        }
        var hindex = 0;
        if (eindex < elen && findex < flen) {
          if (fnow > enow === fnow > -enow) {
            Qnew = enow + Q;
            hh = Q - (Qnew - enow);
            enow = e[++eindex];
          } else {
            Qnew = fnow + Q;
            hh = Q - (Qnew - fnow);
            fnow = f[++findex];
          }
          Q = Qnew;
          if (hh !== 0) {
            h[hindex++] = hh;
          }
          while (eindex < elen && findex < flen) {
            if (fnow > enow === fnow > -enow) {
              Qnew = Q + enow;
              bvirt = Qnew - Q;
              hh = Q - (Qnew - bvirt) + (enow - bvirt);
              enow = e[++eindex];
            } else {
              Qnew = Q + fnow;
              bvirt = Qnew - Q;
              hh = Q - (Qnew - bvirt) + (fnow - bvirt);
              fnow = f[++findex];
            }
            Q = Qnew;
            if (hh !== 0) {
              h[hindex++] = hh;
            }
          }
        }
        while (eindex < elen) {
          Qnew = Q + enow;
          bvirt = Qnew - Q;
          hh = Q - (Qnew - bvirt) + (enow - bvirt);
          enow = e[++eindex];
          Q = Qnew;
          if (hh !== 0) {
            h[hindex++] = hh;
          }
        }
        while (findex < flen) {
          Qnew = Q + fnow;
          bvirt = Qnew - Q;
          hh = Q - (Qnew - bvirt) + (fnow - bvirt);
          fnow = f[++findex];
          Q = Qnew;
          if (hh !== 0) {
            h[hindex++] = hh;
          }
        }
        if (Q !== 0 || hindex === 0) {
          h[hindex++] = Q;
        }
        return hindex;
      }
      function estimate2(elen, e) {
        var Q = e[0];
        for (var i = 1; i < elen; i++) {
          Q += e[i];
        }
        return Q;
      }
      function vec2(n) {
        return new Float64Array(n);
      }
      var ccwerrboundA2 = (3 + 16 * epsilon2) * epsilon2;
      var ccwerrboundB2 = (2 + 12 * epsilon2) * epsilon2;
      var ccwerrboundC2 = (9 + 64 * epsilon2) * epsilon2 * epsilon2;
      var B2 = vec2(4);
      var C12 = vec2(8);
      var C22 = vec2(12);
      var D2 = vec2(16);
      var u4 = vec2(4);
      function orient2dadapt2(ax, ay, bx, by, cx, cy, detsum) {
        var acxtail, acytail, bcxtail, bcytail;
        var bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
        var acx = ax - cx;
        var bcx = bx - cx;
        var acy = ay - cy;
        var bcy = by - cy;
        s1 = acx * bcy;
        c = splitter2 * acx;
        ahi = c - (c - acx);
        alo = acx - ahi;
        c = splitter2 * bcy;
        bhi = c - (c - bcy);
        blo = bcy - bhi;
        s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
        t1 = acy * bcx;
        c = splitter2 * acy;
        ahi = c - (c - acy);
        alo = acy - ahi;
        c = splitter2 * bcx;
        bhi = c - (c - bcx);
        blo = bcx - bhi;
        t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
        _i = s0 - t0;
        bvirt = s0 - _i;
        B2[0] = s0 - (_i + bvirt) + (bvirt - t0);
        _j = s1 + _i;
        bvirt = _j - s1;
        _0 = s1 - (_j - bvirt) + (_i - bvirt);
        _i = _0 - t1;
        bvirt = _0 - _i;
        B2[1] = _0 - (_i + bvirt) + (bvirt - t1);
        u32 = _j + _i;
        bvirt = u32 - _j;
        B2[2] = _j - (u32 - bvirt) + (_i - bvirt);
        B2[3] = u32;
        var det = estimate2(4, B2);
        var errbound = ccwerrboundB2 * detsum;
        if (det >= errbound || -det >= errbound) {
          return det;
        }
        bvirt = ax - acx;
        acxtail = ax - (acx + bvirt) + (bvirt - cx);
        bvirt = bx - bcx;
        bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
        bvirt = ay - acy;
        acytail = ay - (acy + bvirt) + (bvirt - cy);
        bvirt = by - bcy;
        bcytail = by - (bcy + bvirt) + (bvirt - cy);
        if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
          return det;
        }
        errbound = ccwerrboundC2 * detsum + resulterrbound2 * Math.abs(det);
        det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
        if (det >= errbound || -det >= errbound) {
          return det;
        }
        s1 = acxtail * bcy;
        c = splitter2 * acxtail;
        ahi = c - (c - acxtail);
        alo = acxtail - ahi;
        c = splitter2 * bcy;
        bhi = c - (c - bcy);
        blo = bcy - bhi;
        s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
        t1 = acytail * bcx;
        c = splitter2 * acytail;
        ahi = c - (c - acytail);
        alo = acytail - ahi;
        c = splitter2 * bcx;
        bhi = c - (c - bcx);
        blo = bcx - bhi;
        t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
        _i = s0 - t0;
        bvirt = s0 - _i;
        u4[0] = s0 - (_i + bvirt) + (bvirt - t0);
        _j = s1 + _i;
        bvirt = _j - s1;
        _0 = s1 - (_j - bvirt) + (_i - bvirt);
        _i = _0 - t1;
        bvirt = _0 - _i;
        u4[1] = _0 - (_i + bvirt) + (bvirt - t1);
        u32 = _j + _i;
        bvirt = u32 - _j;
        u4[2] = _j - (u32 - bvirt) + (_i - bvirt);
        u4[3] = u32;
        var C1len = sum2(4, B2, 4, u4, C12);
        s1 = acx * bcytail;
        c = splitter2 * acx;
        ahi = c - (c - acx);
        alo = acx - ahi;
        c = splitter2 * bcytail;
        bhi = c - (c - bcytail);
        blo = bcytail - bhi;
        s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
        t1 = acy * bcxtail;
        c = splitter2 * acy;
        ahi = c - (c - acy);
        alo = acy - ahi;
        c = splitter2 * bcxtail;
        bhi = c - (c - bcxtail);
        blo = bcxtail - bhi;
        t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
        _i = s0 - t0;
        bvirt = s0 - _i;
        u4[0] = s0 - (_i + bvirt) + (bvirt - t0);
        _j = s1 + _i;
        bvirt = _j - s1;
        _0 = s1 - (_j - bvirt) + (_i - bvirt);
        _i = _0 - t1;
        bvirt = _0 - _i;
        u4[1] = _0 - (_i + bvirt) + (bvirt - t1);
        u32 = _j + _i;
        bvirt = u32 - _j;
        u4[2] = _j - (u32 - bvirt) + (_i - bvirt);
        u4[3] = u32;
        var C2len = sum2(C1len, C12, 4, u4, C22);
        s1 = acxtail * bcytail;
        c = splitter2 * acxtail;
        ahi = c - (c - acxtail);
        alo = acxtail - ahi;
        c = splitter2 * bcytail;
        bhi = c - (c - bcytail);
        blo = bcytail - bhi;
        s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
        t1 = acytail * bcxtail;
        c = splitter2 * acytail;
        ahi = c - (c - acytail);
        alo = acytail - ahi;
        c = splitter2 * bcxtail;
        bhi = c - (c - bcxtail);
        blo = bcxtail - bhi;
        t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
        _i = s0 - t0;
        bvirt = s0 - _i;
        u4[0] = s0 - (_i + bvirt) + (bvirt - t0);
        _j = s1 + _i;
        bvirt = _j - s1;
        _0 = s1 - (_j - bvirt) + (_i - bvirt);
        _i = _0 - t1;
        bvirt = _0 - _i;
        u4[1] = _0 - (_i + bvirt) + (bvirt - t1);
        u32 = _j + _i;
        bvirt = u32 - _j;
        u4[2] = _j - (u32 - bvirt) + (_i - bvirt);
        u4[3] = u32;
        var Dlen = sum2(C2len, C22, 4, u4, D2);
        return D2[Dlen - 1];
      }
      function orient2d2(ax, ay, bx, by, cx, cy) {
        var detleft = (ay - cy) * (bx - cx);
        var detright = (ax - cx) * (by - cy);
        var det = detleft - detright;
        if (detleft === 0 || detright === 0 || detleft > 0 !== detright > 0) {
          return det;
        }
        var detsum = Math.abs(detleft + detright);
        if (Math.abs(det) >= ccwerrboundA2 * detsum) {
          return det;
        }
        return -orient2dadapt2(ax, ay, bx, by, cx, cy, detsum);
      }
      function signedArea(p0, p1, p2) {
        var res = orient2d2(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]);
        if (res > 0) {
          return -1;
        }
        if (res < 0) {
          return 1;
        }
        return 0;
      }
      function compareEvents(e1, e2) {
        var p1 = e1.point;
        var p2 = e2.point;
        if (p1[0] > p2[0]) {
          return 1;
        }
        if (p1[0] < p2[0]) {
          return -1;
        }
        if (p1[1] !== p2[1]) {
          return p1[1] > p2[1] ? 1 : -1;
        }
        return specialCases(e1, e2, p1);
      }
      function specialCases(e1, e2, p1, p2) {
        if (e1.left !== e2.left) {
          return e1.left ? 1 : -1;
        }
        if (signedArea(p1, e1.otherEvent.point, e2.otherEvent.point) !== 0) {
          return !e1.isBelow(e2.otherEvent.point) ? 1 : -1;
        }
        return !e1.isSubject && e2.isSubject ? 1 : -1;
      }
      function divideSegment(se, p, queue) {
        var r = new SweepEvent(p, false, se, se.isSubject);
        var l = new SweepEvent(p, true, se.otherEvent, se.isSubject);
        if (equals(se.point, se.otherEvent.point)) {
          console.warn("what is that, a collapsed segment?", se);
        }
        r.contourId = l.contourId = se.contourId;
        if (compareEvents(l, se.otherEvent) > 0) {
          se.otherEvent.left = true;
          l.left = false;
        }
        se.otherEvent.otherEvent = l;
        se.otherEvent = r;
        queue.push(l);
        queue.push(r);
        return queue;
      }
      function crossProduct(a, b) {
        return a[0] * b[1] - a[1] * b[0];
      }
      function dotProduct(a, b) {
        return a[0] * b[0] + a[1] * b[1];
      }
      function intersection2(a1, a2, b1, b2, noEndpointTouch) {
        var va = [a2[0] - a1[0], a2[1] - a1[1]];
        var vb = [b2[0] - b1[0], b2[1] - b1[1]];
        function toPoint(p, s2, d) {
          return [
            p[0] + s2 * d[0],
            p[1] + s2 * d[1]
          ];
        }
        var e = [b1[0] - a1[0], b1[1] - a1[1]];
        var kross = crossProduct(va, vb);
        var sqrKross = kross * kross;
        var sqrLenA = dotProduct(va, va);
        if (sqrKross > 0) {
          var s = crossProduct(e, vb) / kross;
          if (s < 0 || s > 1) {
            return null;
          }
          var t = crossProduct(e, va) / kross;
          if (t < 0 || t > 1) {
            return null;
          }
          if (s === 0 || s === 1) {
            return noEndpointTouch ? null : [toPoint(a1, s, va)];
          }
          if (t === 0 || t === 1) {
            return noEndpointTouch ? null : [toPoint(b1, t, vb)];
          }
          return [toPoint(a1, s, va)];
        }
        kross = crossProduct(e, va);
        sqrKross = kross * kross;
        if (sqrKross > 0) {
          return null;
        }
        var sa = dotProduct(va, e) / sqrLenA;
        var sb = sa + dotProduct(va, vb) / sqrLenA;
        var smin = Math.min(sa, sb);
        var smax = Math.max(sa, sb);
        if (smin <= 1 && smax >= 0) {
          if (smin === 1) {
            return noEndpointTouch ? null : [toPoint(a1, smin > 0 ? smin : 0, va)];
          }
          if (smax === 0) {
            return noEndpointTouch ? null : [toPoint(a1, smax < 1 ? smax : 1, va)];
          }
          if (noEndpointTouch && smin === 0 && smax === 1) {
            return null;
          }
          return [
            toPoint(a1, smin > 0 ? smin : 0, va),
            toPoint(a1, smax < 1 ? smax : 1, va)
          ];
        }
        return null;
      }
      function possibleIntersection(se1, se2, queue) {
        var inter = intersection2(
          se1.point,
          se1.otherEvent.point,
          se2.point,
          se2.otherEvent.point
        );
        var nintersections = inter ? inter.length : 0;
        if (nintersections === 0) {
          return 0;
        }
        if (nintersections === 1 && (equals(se1.point, se2.point) || equals(se1.otherEvent.point, se2.otherEvent.point))) {
          return 0;
        }
        if (nintersections === 2 && se1.isSubject === se2.isSubject) {
          return 0;
        }
        if (nintersections === 1) {
          if (!equals(se1.point, inter[0]) && !equals(se1.otherEvent.point, inter[0])) {
            divideSegment(se1, inter[0], queue);
          }
          if (!equals(se2.point, inter[0]) && !equals(se2.otherEvent.point, inter[0])) {
            divideSegment(se2, inter[0], queue);
          }
          return 1;
        }
        var events = [];
        var leftCoincide = false;
        var rightCoincide = false;
        if (equals(se1.point, se2.point)) {
          leftCoincide = true;
        } else if (compareEvents(se1, se2) === 1) {
          events.push(se2, se1);
        } else {
          events.push(se1, se2);
        }
        if (equals(se1.otherEvent.point, se2.otherEvent.point)) {
          rightCoincide = true;
        } else if (compareEvents(se1.otherEvent, se2.otherEvent) === 1) {
          events.push(se2.otherEvent, se1.otherEvent);
        } else {
          events.push(se1.otherEvent, se2.otherEvent);
        }
        if (leftCoincide && rightCoincide || leftCoincide) {
          se2.type = NON_CONTRIBUTING;
          se1.type = se2.inOut === se1.inOut ? SAME_TRANSITION : DIFFERENT_TRANSITION;
          if (leftCoincide && !rightCoincide) {
            divideSegment(events[1].otherEvent, events[0].point, queue);
          }
          return 2;
        }
        if (rightCoincide) {
          divideSegment(events[0], events[1].point, queue);
          return 3;
        }
        if (events[0] !== events[3].otherEvent) {
          divideSegment(events[0], events[1].point, queue);
          divideSegment(events[1], events[2].point, queue);
          return 3;
        }
        divideSegment(events[0], events[1].point, queue);
        divideSegment(events[3].otherEvent, events[2].point, queue);
        return 3;
      }
      function compareSegments(le1, le2) {
        if (le1 === le2) {
          return 0;
        }
        if (signedArea(le1.point, le1.otherEvent.point, le2.point) !== 0 || signedArea(le1.point, le1.otherEvent.point, le2.otherEvent.point) !== 0) {
          if (equals(le1.point, le2.point)) {
            return le1.isBelow(le2.otherEvent.point) ? -1 : 1;
          }
          if (le1.point[0] === le2.point[0]) {
            return le1.point[1] < le2.point[1] ? -1 : 1;
          }
          if (compareEvents(le1, le2) === 1) {
            return le2.isAbove(le1.point) ? -1 : 1;
          }
          return le1.isBelow(le2.point) ? -1 : 1;
        }
        if (le1.isSubject === le2.isSubject) {
          var p1 = le1.point, p2 = le2.point;
          if (p1[0] === p2[0] && p1[1] === p2[1]) {
            p1 = le1.otherEvent.point;
            p2 = le2.otherEvent.point;
            if (p1[0] === p2[0] && p1[1] === p2[1]) {
              return 0;
            } else {
              return le1.contourId > le2.contourId ? 1 : -1;
            }
          }
        } else {
          return le1.isSubject ? -1 : 1;
        }
        return compareEvents(le1, le2) === 1 ? 1 : -1;
      }
      function subdivide(eventQueue, subject, clipping, sbbox, cbbox, operation) {
        var sweepLine = new SplayTree(compareSegments);
        var sortedEvents = [];
        var rightbound = Math.min(sbbox[2], cbbox[2]);
        var prev, next, begin;
        while (eventQueue.length !== 0) {
          var event = eventQueue.pop();
          sortedEvents.push(event);
          if (operation === INTERSECTION && event.point[0] > rightbound || operation === DIFFERENCE && event.point[0] > sbbox[2]) {
            break;
          }
          if (event.left) {
            next = prev = sweepLine.insert(event);
            begin = sweepLine.minNode();
            if (prev !== begin) {
              prev = sweepLine.prev(prev);
            } else {
              prev = null;
            }
            next = sweepLine.next(next);
            var prevEvent = prev ? prev.key : null;
            var prevprevEvent = void 0;
            computeFields(event, prevEvent, operation);
            if (next) {
              if (possibleIntersection(event, next.key, eventQueue) === 2) {
                computeFields(event, prevEvent, operation);
                computeFields(next.key, event, operation);
              }
            }
            if (prev) {
              if (possibleIntersection(prev.key, event, eventQueue) === 2) {
                var prevprev = prev;
                if (prevprev !== begin) {
                  prevprev = sweepLine.prev(prevprev);
                } else {
                  prevprev = null;
                }
                prevprevEvent = prevprev ? prevprev.key : null;
                computeFields(prevEvent, prevprevEvent, operation);
                computeFields(event, prevEvent, operation);
              }
            }
          } else {
            event = event.otherEvent;
            next = prev = sweepLine.find(event);
            if (prev && next) {
              if (prev !== begin) {
                prev = sweepLine.prev(prev);
              } else {
                prev = null;
              }
              next = sweepLine.next(next);
              sweepLine.remove(event);
              if (next && prev) {
                possibleIntersection(prev.key, next.key, eventQueue);
              }
            }
          }
        }
        return sortedEvents;
      }
      var Contour = function Contour2() {
        this.points = [];
        this.holeIds = [];
        this.holeOf = null;
        this.depth = null;
      };
      Contour.prototype.isExterior = function isExterior() {
        return this.holeOf == null;
      };
      function orderEvents(sortedEvents) {
        var event, i, len, tmp;
        var resultEvents = [];
        for (i = 0, len = sortedEvents.length; i < len; i++) {
          event = sortedEvents[i];
          if (event.left && event.inResult || !event.left && event.otherEvent.inResult) {
            resultEvents.push(event);
          }
        }
        var sorted = false;
        while (!sorted) {
          sorted = true;
          for (i = 0, len = resultEvents.length; i < len; i++) {
            if (i + 1 < len && compareEvents(resultEvents[i], resultEvents[i + 1]) === 1) {
              tmp = resultEvents[i];
              resultEvents[i] = resultEvents[i + 1];
              resultEvents[i + 1] = tmp;
              sorted = false;
            }
          }
        }
        for (i = 0, len = resultEvents.length; i < len; i++) {
          event = resultEvents[i];
          event.otherPos = i;
        }
        for (i = 0, len = resultEvents.length; i < len; i++) {
          event = resultEvents[i];
          if (!event.left) {
            tmp = event.otherPos;
            event.otherPos = event.otherEvent.otherPos;
            event.otherEvent.otherPos = tmp;
          }
        }
        return resultEvents;
      }
      function nextPos(pos, resultEvents, processed, origPos) {
        var newPos = pos + 1, p = resultEvents[pos].point, p1;
        var length = resultEvents.length;
        if (newPos < length) {
          p1 = resultEvents[newPos].point;
        }
        while (newPos < length && p1[0] === p[0] && p1[1] === p[1]) {
          if (!processed[newPos]) {
            return newPos;
          } else {
            newPos++;
          }
          if (newPos < length) {
            p1 = resultEvents[newPos].point;
          }
        }
        newPos = pos - 1;
        while (processed[newPos] && newPos > origPos) {
          newPos--;
        }
        return newPos;
      }
      function initializeContourFromContext(event, contours, contourId2) {
        var contour = new Contour();
        if (event.prevInResult != null) {
          var prevInResult = event.prevInResult;
          var lowerContourId = prevInResult.outputContourId;
          var lowerResultTransition = prevInResult.resultTransition;
          if (lowerResultTransition > 0) {
            var lowerContour = contours[lowerContourId];
            if (lowerContour.holeOf != null) {
              var parentContourId = lowerContour.holeOf;
              contours[parentContourId].holeIds.push(contourId2);
              contour.holeOf = parentContourId;
              contour.depth = contours[lowerContourId].depth;
            } else {
              contours[lowerContourId].holeIds.push(contourId2);
              contour.holeOf = lowerContourId;
              contour.depth = contours[lowerContourId].depth + 1;
            }
          } else {
            contour.holeOf = null;
            contour.depth = contours[lowerContourId].depth;
          }
        } else {
          contour.holeOf = null;
          contour.depth = 0;
        }
        return contour;
      }
      function connectEdges(sortedEvents) {
        var i, len;
        var resultEvents = orderEvents(sortedEvents);
        var processed = {};
        var contours = [];
        var loop = function() {
          if (processed[i]) {
            return;
          }
          var contourId2 = contours.length;
          var contour = initializeContourFromContext(resultEvents[i], contours, contourId2);
          var markAsProcessed = function(pos2) {
            processed[pos2] = true;
            if (pos2 < resultEvents.length && resultEvents[pos2]) {
              resultEvents[pos2].outputContourId = contourId2;
            }
          };
          var pos = i;
          var origPos = i;
          var initial = resultEvents[i].point;
          contour.points.push(initial);
          while (true) {
            markAsProcessed(pos);
            pos = resultEvents[pos].otherPos;
            markAsProcessed(pos);
            contour.points.push(resultEvents[pos].point);
            pos = nextPos(pos, resultEvents, processed, origPos);
            if (pos == origPos || pos >= resultEvents.length || !resultEvents[pos]) {
              break;
            }
          }
          contours.push(contour);
        };
        for (i = 0, len = resultEvents.length; i < len; i++) loop();
        return contours;
      }
      var tinyqueue = TinyQueue;
      var default_1 = TinyQueue;
      function TinyQueue(data, compare) {
        if (!(this instanceof TinyQueue)) {
          return new TinyQueue(data, compare);
        }
        this.data = data || [];
        this.length = this.data.length;
        this.compare = compare || defaultCompare;
        if (this.length > 0) {
          for (var i = (this.length >> 1) - 1; i >= 0; i--) {
            this._down(i);
          }
        }
      }
      function defaultCompare(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
      }
      TinyQueue.prototype = {
        push: function(item) {
          this.data.push(item);
          this.length++;
          this._up(this.length - 1);
        },
        pop: function() {
          if (this.length === 0) {
            return void 0;
          }
          var top = this.data[0];
          this.length--;
          if (this.length > 0) {
            this.data[0] = this.data[this.length];
            this._down(0);
          }
          this.data.pop();
          return top;
        },
        peek: function() {
          return this.data[0];
        },
        _up: function(pos) {
          var data = this.data;
          var compare = this.compare;
          var item = data[pos];
          while (pos > 0) {
            var parent = pos - 1 >> 1;
            var current = data[parent];
            if (compare(item, current) >= 0) {
              break;
            }
            data[pos] = current;
            pos = parent;
          }
          data[pos] = item;
        },
        _down: function(pos) {
          var data = this.data;
          var compare = this.compare;
          var halfLength = this.length >> 1;
          var item = data[pos];
          while (pos < halfLength) {
            var left = (pos << 1) + 1;
            var right = left + 1;
            var best = data[left];
            if (right < this.length && compare(data[right], best) < 0) {
              left = right;
              best = data[right];
            }
            if (compare(best, item) >= 0) {
              break;
            }
            data[pos] = best;
            pos = left;
          }
          data[pos] = item;
        }
      };
      tinyqueue.default = default_1;
      var max = Math.max;
      var min = Math.min;
      var contourId = 0;
      function processPolygon(contourOrHole, isSubject, depth, Q, bbox, isExteriorRing) {
        var i, len, s1, s2, e1, e2;
        for (i = 0, len = contourOrHole.length - 1; i < len; i++) {
          s1 = contourOrHole[i];
          s2 = contourOrHole[i + 1];
          e1 = new SweepEvent(s1, false, void 0, isSubject);
          e2 = new SweepEvent(s2, false, e1, isSubject);
          e1.otherEvent = e2;
          if (s1[0] === s2[0] && s1[1] === s2[1]) {
            continue;
          }
          e1.contourId = e2.contourId = depth;
          if (!isExteriorRing) {
            e1.isExteriorRing = false;
            e2.isExteriorRing = false;
          }
          if (compareEvents(e1, e2) > 0) {
            e2.left = true;
          } else {
            e1.left = true;
          }
          var x = s1[0], y = s1[1];
          bbox[0] = min(bbox[0], x);
          bbox[1] = min(bbox[1], y);
          bbox[2] = max(bbox[2], x);
          bbox[3] = max(bbox[3], y);
          Q.push(e1);
          Q.push(e2);
        }
      }
      function fillQueue(subject, clipping, sbbox, cbbox, operation) {
        var eventQueue = new tinyqueue(null, compareEvents);
        var polygonSet, isExteriorRing, i, ii, j, jj;
        for (i = 0, ii = subject.length; i < ii; i++) {
          polygonSet = subject[i];
          for (j = 0, jj = polygonSet.length; j < jj; j++) {
            isExteriorRing = j === 0;
            if (isExteriorRing) {
              contourId++;
            }
            processPolygon(polygonSet[j], true, contourId, eventQueue, sbbox, isExteriorRing);
          }
        }
        for (i = 0, ii = clipping.length; i < ii; i++) {
          polygonSet = clipping[i];
          for (j = 0, jj = polygonSet.length; j < jj; j++) {
            isExteriorRing = j === 0;
            if (operation === DIFFERENCE) {
              isExteriorRing = false;
            }
            if (isExteriorRing) {
              contourId++;
            }
            processPolygon(polygonSet[j], false, contourId, eventQueue, cbbox, isExteriorRing);
          }
        }
        return eventQueue;
      }
      var EMPTY = [];
      function trivialOperation(subject, clipping, operation) {
        var result = null;
        if (subject.length * clipping.length === 0) {
          if (operation === INTERSECTION) {
            result = EMPTY;
          } else if (operation === DIFFERENCE) {
            result = subject;
          } else if (operation === UNION || operation === XOR) {
            result = subject.length === 0 ? clipping : subject;
          }
        }
        return result;
      }
      function compareBBoxes(subject, clipping, sbbox, cbbox, operation) {
        var result = null;
        if (sbbox[0] > cbbox[2] || cbbox[0] > sbbox[2] || sbbox[1] > cbbox[3] || cbbox[1] > sbbox[3]) {
          if (operation === INTERSECTION) {
            result = EMPTY;
          } else if (operation === DIFFERENCE) {
            result = subject;
          } else if (operation === UNION || operation === XOR) {
            result = subject.concat(clipping);
          }
        }
        return result;
      }
      function boolean(subject, clipping, operation) {
        if (typeof subject[0][0][0] === "number") {
          subject = [subject];
        }
        if (typeof clipping[0][0][0] === "number") {
          clipping = [clipping];
        }
        var trivial = trivialOperation(subject, clipping, operation);
        if (trivial) {
          return trivial === EMPTY ? null : trivial;
        }
        var sbbox = [Infinity, Infinity, -Infinity, -Infinity];
        var cbbox = [Infinity, Infinity, -Infinity, -Infinity];
        var eventQueue = fillQueue(subject, clipping, sbbox, cbbox, operation);
        trivial = compareBBoxes(subject, clipping, sbbox, cbbox, operation);
        if (trivial) {
          return trivial === EMPTY ? null : trivial;
        }
        var sortedEvents = subdivide(eventQueue, subject, clipping, sbbox, cbbox, operation);
        var contours = connectEdges(sortedEvents);
        var polygons = [];
        for (var i = 0; i < contours.length; i++) {
          var contour = contours[i];
          if (contour.isExterior()) {
            var rings = [contour.points];
            for (var j = 0; j < contour.holeIds.length; j++) {
              var holeId = contour.holeIds[j];
              rings.push(contours[holeId].points);
            }
            polygons.push(rings);
          }
        }
        return polygons;
      }
      function union3(subject, clipping) {
        return boolean(subject, clipping, UNION);
      }
      function diff2(subject, clipping) {
        return boolean(subject, clipping, DIFFERENCE);
      }
      function xor(subject, clipping) {
        return boolean(subject, clipping, XOR);
      }
      function intersection$1(subject, clipping) {
        return boolean(subject, clipping, INTERSECTION);
      }
      var operations = { UNION, DIFFERENCE, INTERSECTION, XOR };
      exports2.diff = diff2;
      exports2.intersection = intersection$1;
      exports2.operations = operations;
      exports2.union = union3;
      exports2.xor = xor;
      Object.defineProperty(exports2, "__esModule", { value: true });
    }));
  }
});

// ../../Scaffolda-public/src/features/scaffolda/lib/siteZoneProperties.ts
var PYEONG_TO_SQUARE_METERS = 3.305785;
var DEFAULT_ZONE_CAPACITY = 10;
var MIN_ZONE_CAPACITY = 1;
var MAX_ZONE_CAPACITY = 9999;
var RECOMMENDED_AREA_PYEONG_PER_CAPACITY = 4;
var DEFAULT_AREA_PER_PERSON_M2 = RECOMMENDED_AREA_PYEONG_PER_CAPACITY * PYEONG_TO_SQUARE_METERS;
var RECOMMENDED_ZONE_ASPECT_RATIO = 1.5;
function resolveAreaPerPersonPyeong(areaPerPersonM2) {
  if (typeof areaPerPersonM2 !== "number" || !Number.isFinite(areaPerPersonM2) || areaPerPersonM2 <= 0) {
    return RECOMMENDED_AREA_PYEONG_PER_CAPACITY;
  }
  return areaPerPersonM2 / PYEONG_TO_SQUARE_METERS;
}
function createDefaultZoneProperties(capacity = DEFAULT_ZONE_CAPACITY, areaPerPersonM2) {
  const normalizedCapacity = normalizeZoneCapacity(capacity);
  const dimensions = createRecommendedZoneDimensions(normalizedCapacity, areaPerPersonM2);
  return {
    capacity: normalizedCapacity,
    ...dimensions
  };
}
function normalizeZoneProperties(value, fallbackCapacity = DEFAULT_ZONE_CAPACITY) {
  const capacity = isRecord(value) && value.capacity !== void 0 ? normalizeZoneCapacity(value.capacity) : normalizeZoneCapacity(fallbackCapacity);
  return createDefaultZoneProperties(capacity);
}
function createZoneAreaMetrics(points, floors, areaPerPersonM2) {
  const footprintAreaSquareMeters = roundToTenth(calculateLocalPolygonAreaSquareMeters(points));
  const footprintAreaPyeong = roundToTenth(footprintAreaSquareMeters / PYEONG_TO_SQUARE_METERS);
  const floorCount = resolveAreaFloorCount(floors);
  const totalFloorAreaSquareMeters = roundToTenth(footprintAreaSquareMeters * floorCount);
  const totalFloorAreaPyeong = roundToTenth(totalFloorAreaSquareMeters / PYEONG_TO_SQUARE_METERS);
  const rawCapacity = totalFloorAreaPyeong / resolveAreaPerPersonPyeong(areaPerPersonM2);
  return {
    capacity: rawCapacity > 0 ? normalizeZoneCapacity(rawCapacity) : 0,
    footprintAreaPyeong,
    footprintAreaSquareMeters,
    totalFloorAreaPyeong,
    totalFloorAreaSquareMeters
  };
}
function calculateLocalPolygonAreaSquareMeters(points) {
  if (points.length < 3) {
    return 0;
  }
  let signedArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const currentPoint = points[index];
    const nextPoint = points[(index + 1) % points.length];
    signedArea += currentPoint.x * nextPoint.y - nextPoint.x * currentPoint.y;
  }
  return Math.abs(signedArea) / 2;
}
function createRecommendedZoneDimensions(capacity, areaPerPersonM2) {
  const normalizedCapacity = normalizeZoneCapacity(capacity);
  const recommendedAreaPyeong = normalizedCapacity * resolveAreaPerPersonPyeong(areaPerPersonM2);
  const recommendedAreaSquareMeters = roundToTenth(recommendedAreaPyeong * PYEONG_TO_SQUARE_METERS);
  const recommendedWidthMeters = roundToTenth(
    Math.sqrt(recommendedAreaSquareMeters * RECOMMENDED_ZONE_ASPECT_RATIO)
  );
  const recommendedDepthMeters = roundToTenth(recommendedAreaSquareMeters / recommendedWidthMeters);
  return {
    recommendedAreaPyeong,
    recommendedAreaSquareMeters,
    recommendedWidthMeters,
    recommendedDepthMeters
  };
}
function normalizeZoneCapacity(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_ZONE_CAPACITY;
  }
  return Math.min(MAX_ZONE_CAPACITY, Math.max(MIN_ZONE_CAPACITY, Math.round(Number(value))));
}
function resolveAreaFloorCount(floors) {
  if (!Number.isFinite(floors)) {
    return 1;
  }
  return Math.max(1, Math.round(Number(floors)));
}
function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../Scaffolda-public/src/features/scaffolda/lib/earthworkModel.ts
var DEFAULT_EARTHWORK_CONFIG = {
  cutCostPerM3: 8e3,
  fillCostPerM3: 12e3,
  wallCostPerM2: 25e4,
  buildingCostPerPyeong: 2e6,
  foundationCostPerM2: 15e4,
  // step > base 여야 "고층 = 1인당 기초비 증가" 트레이드오프가 성립한다(절·성토 감소와 균형).
  foundationFloorStepPerM2: 225e3,
  overheadRate: 0.1,
  gridSpacingM: 2,
  edgeProbeM: 3,
  wallSlopeThreshold: 0.3,
  wallMinStepM: 0.3,
  slopeMinStepM: 0.05,
  difficultyThresholdsKrw: {
    moderate: 3e6,
    high: 45e5,
    severe: 7e6
  }
};
function buildEarthworkReselectionIssues(zones, earthworkByZoneId) {
  const issues = [];
  for (const zone of zones) {
    const result = earthworkByZoneId[zone.id];
    if (!result?.recommendReselection) {
      continue;
    }
    issues.push({
      id: `EARTHWORK_RESELECTION:${zone.id}`,
      severity: "warning",
      code: "EARTHWORK_RESELECTION",
      message: `${zone.label} \uBD80\uC9C0\uB294 \uC2DC\uACF5 \uB09C\uC774\uB3C4\uAC00 \uB9E4\uC6B0 \uB192\uC544(\uCD94\uC815 1\uC778\uB2F9 \uBE44\uC6A9 \uACFC\uB2E4) \uBD80\uC9C0 \uC7AC\uC120\uC815\uC744 \uACE0\uB824\uD558\uC138\uC694.`,
      objectIds: [zone.id]
    });
  }
  return issues;
}
function computeEarthwork(footprint, floors, sampleGround, config = DEFAULT_EARTHWORK_CONFIG, options) {
  if (footprint.length < 3) {
    return null;
  }
  const region = options?.gradedBoundary && options.gradedBoundary.length >= 3 ? options.gradedBoundary : footprint;
  const cellArea = config.gridSpacingM * config.gridSpacingM;
  const samples = collectGroundSamples(region, sampleGround, config.gridSpacingM);
  if (samples.sampled.length === 0) {
    return null;
  }
  const padElevationM = options?.padElevationM !== void 0 && Number.isFinite(options.padElevationM) ? options.padElevationM : mean(samples.sampled);
  let cutVolumeM3 = 0;
  let fillVolumeM3 = 0;
  for (const groundM of samples.sampled) {
    const deviation = groundM - padElevationM;
    if (deviation > 0) {
      cutVolumeM3 += deviation * cellArea;
    } else if (deviation < 0) {
      fillVolumeM3 += -deviation * cellArea;
    }
  }
  const edges = classifyEdges(region, padElevationM, sampleGround, config);
  const retainingWallAreaM2 = sumFaceArea(edges, "wall");
  const gradedSlopeAreaM2 = sumFaceArea(edges, "slope");
  const areaMetrics = createZoneAreaMetrics(footprint, floors);
  const earthworkKrw = cutVolumeM3 * config.cutCostPerM3 + fillVolumeM3 * config.fillCostPerM3;
  const wallKrw = retainingWallAreaM2 * config.wallCostPerM2;
  const floorCount = Math.max(1, Math.round(floors));
  const foundationKrw = areaMetrics.footprintAreaSquareMeters * (config.foundationCostPerM2 + config.foundationFloorStepPerM2 * (floorCount - 1));
  const buildingKrw = areaMetrics.totalFloorAreaPyeong * config.buildingCostPerPyeong;
  const siteKrw = earthworkKrw + wallKrw + foundationKrw;
  const subtotalKrw = siteKrw + buildingKrw;
  const overheadKrw = subtotalKrw * config.overheadRate;
  const totalCostKrw = subtotalKrw + overheadKrw;
  const capacityCount = Math.max(areaMetrics.capacity, 1);
  const costPerPersonKrw = totalCostKrw / capacityCount;
  const siteCostPerPersonKrw = siteKrw * (1 + config.overheadRate) / capacityCount;
  const difficulty = classifyDifficulty(siteCostPerPersonKrw, config.difficultyThresholdsKrw);
  const recommendReselection = difficulty === "severe";
  return {
    padElevationM: roundTo(padElevationM, 2),
    cutVolumeM3: roundTo(cutVolumeM3, 1),
    fillVolumeM3: roundTo(fillVolumeM3, 1),
    netVolumeM3: roundTo(cutVolumeM3 - fillVolumeM3, 1),
    edges,
    retainingWallAreaM2: roundTo(retainingWallAreaM2, 1),
    gradedSlopeAreaM2: roundTo(gradedSlopeAreaM2, 1),
    costBreakdown: {
      earthworkKrw: Math.round(earthworkKrw),
      wallKrw: Math.round(wallKrw),
      foundationKrw: Math.round(foundationKrw),
      buildingKrw: Math.round(buildingKrw),
      overheadKrw: Math.round(overheadKrw)
    },
    totalCostKrw: Math.round(totalCostKrw),
    costPerPersonKrw: Math.round(costPerPersonKrw),
    siteCostPerPersonKrw: Math.round(siteCostPerPersonKrw),
    difficulty,
    recommendReselection,
    coverage: roundTo(samples.coverage, 3)
  };
}
function collectGroundSamples(footprint, sampleGround, spacingM) {
  const xs = footprint.map((point) => point.x);
  const ys = footprint.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sampled = [];
  let insideCells = 0;
  for (let x = minX + spacingM / 2; x < maxX; x += spacingM) {
    for (let y = minY + spacingM / 2; y < maxY; y += spacingM) {
      const point = { x, y };
      if (!isPointInPolygon(point, footprint)) {
        continue;
      }
      insideCells += 1;
      const groundM = sampleGround(point);
      if (groundM !== null && Number.isFinite(groundM)) {
        sampled.push(groundM);
      }
    }
  }
  return {
    sampled,
    coverage: insideCells > 0 ? sampled.length / insideCells : 0
  };
}
function classifyEdges(footprint, padElevationM, sampleGround, config) {
  const centroid = polygonCentroid(footprint);
  return footprint.map((start, index) => {
    const end = footprint[(index + 1) % footprint.length];
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const lengthM = distance(start, end);
    const groundMid = sampleGround(mid);
    const probe = probeInward(mid, centroid, config.edgeProbeM);
    const groundIn = probe ? sampleGround(probe) : null;
    if (groundMid === null || !Number.isFinite(groundMid) || groundIn === null || !Number.isFinite(groundIn)) {
      return { edgeIndex: index, kind: "none", stepHeightM: 0, slopeRatio: 0, lengthM: roundTo(lengthM, 2), faceAreaM2: 0 };
    }
    const stepHeightM = padElevationM - groundMid;
    const slopeRatio = Math.abs(groundMid - groundIn) / config.edgeProbeM;
    const absStep = Math.abs(stepHeightM);
    let kind = "none";
    if (slopeRatio >= config.wallSlopeThreshold && absStep >= config.wallMinStepM) {
      kind = "wall";
    } else if (absStep >= config.slopeMinStepM) {
      kind = "slope";
    }
    const faceAreaM2 = kind === "none" ? 0 : lengthM * absStep;
    return {
      edgeIndex: index,
      kind,
      stepHeightM: roundTo(stepHeightM, 2),
      slopeRatio: roundTo(slopeRatio, 3),
      lengthM: roundTo(lengthM, 2),
      faceAreaM2: roundTo(faceAreaM2, 1)
    };
  });
}
function probeInward(mid, centroid, distanceM) {
  const dx = centroid.x - mid.x;
  const dy = centroid.y - mid.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return null;
  }
  return {
    x: mid.x + dx / length * distanceM,
    y: mid.y + dy / length * distanceM
  };
}
function sumFaceArea(edges, kind) {
  return edges.filter((edge) => edge.kind === kind).reduce((sum2, edge) => sum2 + edge.faceAreaM2, 0);
}
function classifyDifficulty(costPerPersonKrw, thresholds) {
  if (costPerPersonKrw >= thresholds.severe) {
    return "severe";
  }
  if (costPerPersonKrw >= thresholds.high) {
    return "high";
  }
  if (costPerPersonKrw >= thresholds.moderate) {
    return "moderate";
  }
  return "low";
}
function polygonCentroid(points) {
  const sum2 = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum2.x / points.length, y: sum2.y / points.length };
}
function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y && point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function mean(values) {
  return values.reduce((sum2, value) => sum2 + value, 0) / values.length;
}
function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// ../../Scaffolda-public/src/features/scaffolda/lib/localCoordinate.ts
var METERS_PER_DEGREE_LAT = 111320;
function lngLatToLocalMeters(lng, lat, origin) {
  const metersPerDegreeLng = getMetersPerDegreeLng(origin.lat);
  return {
    x: (lng - origin.lng) * metersPerDegreeLng,
    y: (lat - origin.lat) * METERS_PER_DEGREE_LAT
  };
}
function localMetersToLngLat(x, y, origin) {
  const metersPerDegreeLng = getMetersPerDegreeLng(origin.lat);
  return {
    lng: origin.lng + x / metersPerDegreeLng,
    lat: origin.lat + y / METERS_PER_DEGREE_LAT
  };
}
function polygonLngLatToLocalMeters(boundaryGeoJson, origin) {
  const outerRing = boundaryGeoJson.coordinates[0] ?? [];
  return outerRing.map(([lng, lat]) => lngLatToLocalMeters(lng, lat, origin));
}
function getMetersPerDegreeLng(originLat) {
  return METERS_PER_DEGREE_LAT * Math.cos(originLat * Math.PI / 180);
}

// ../../Scaffolda-public/src/features/scaffolda/lib/siteRoad.ts
var ROAD_LANE_WIDTH_METERS = 4;
var ROAD_MIN_LANES = 1;
var ROAD_MAX_LANES = 3;
function createDefaultRoadProperties() {
  return createRoadProperties({
    direction: "one-way",
    lanes: ROAD_MIN_LANES,
    laneWidthMeters: ROAD_LANE_WIDTH_METERS
  });
}
function calculateRoadWidthMeters(input) {
  const directionMultiplier = input.direction === "two-way" ? 2 : 1;
  return input.lanes * input.laneWidthMeters * directionMultiplier;
}
function normalizeRoadProperties(input) {
  if (!isRecord2(input)) {
    return createDefaultRoadProperties();
  }
  const direction = input.direction === "two-way" ? "two-way" : "one-way";
  const laneWidthMeters = Number.isFinite(input.laneWidthMeters) && Number(input.laneWidthMeters) > 0 ? Number(input.laneWidthMeters) : ROAD_LANE_WIDTH_METERS;
  return createRoadProperties({
    direction,
    lanes: Number(input.lanes),
    laneWidthMeters
  });
}
function updateRoadProperties(currentRoad, patch) {
  const current = normalizeRoadProperties(currentRoad);
  const direction = patch.direction ?? current.direction;
  const lanes = patch.lanes ?? current.lanes;
  return createRoadProperties({
    direction,
    lanes,
    laneWidthMeters: current.laneWidthMeters
  });
}
function isRoadZone(zone) {
  return zone.shape === "road" || zone.shape === void 0 && zone.facilityTypeId === "road";
}
var FENCE_FACILITY_TYPE_ID = "fence";
function isFenceZone(zone) {
  return zone.facilityTypeId === FENCE_FACILITY_TYPE_ID;
}
function createRoadProperties(input) {
  const lanes = normalizeLaneCount(input.lanes);
  const laneWidthMeters = input.laneWidthMeters;
  return {
    direction: input.direction,
    lanes,
    laneWidthMeters,
    widthMeters: calculateRoadWidthMeters({
      direction: input.direction,
      lanes,
      laneWidthMeters
    })
  };
}
function normalizeLaneCount(value) {
  if (!Number.isFinite(value)) {
    return ROAD_MIN_LANES;
  }
  return Math.min(ROAD_MAX_LANES, Math.max(ROAD_MIN_LANES, Math.round(Number(value))));
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../Scaffolda-public/src/features/scaffolda/lib/siteZoneGeometry.ts
var import_martinez_polygon_clipping = __toESM(require_martinez_umd(), 1);
var POINT_ON_LINE_TOLERANCE_METERS = 0.75;
var MIN_VECTOR_LENGTH_METERS = 0.01;
var GEOMETRY_EPSILON = 1e-6;
var POLYGON_OFFSET_MITER_LIMIT = 4;
var POLYGON_OFFSET_PARALLEL_EPSILON = 1e-9;
function isPolygonInsidePolygon(candidate, parent, tolerance = POINT_ON_LINE_TOLERANCE_METERS) {
  if (candidate.length < 3 || parent.length < 3) {
    return false;
  }
  return candidate.every((point) => isPointInsidePolygonOrOnBoundary(point, parent, tolerance)) && arePolygonSegmentsInsidePolygon(candidate, parent, tolerance);
}
function arePointsInsidePolygon(points, parent, tolerance = POINT_ON_LINE_TOLERANCE_METERS) {
  if (points.length === 0 || parent.length < 3) {
    return false;
  }
  return points.every((point) => isPointInsidePolygonOrOnBoundary(point, parent, tolerance));
}
function offsetPolygonOutward(points, distanceMeters) {
  if (points.length < 3 || distanceMeters === 0) {
    return points.map((point) => ({ ...point }));
  }
  const outwardSign = getPolygonSignedArea(points) >= 0 ? 1 : -1;
  const offsetVertices = [];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const incomingNormal = getOutwardEdgeNormal(previous, current, outwardSign);
    const outgoingNormal = getOutwardEdgeNormal(current, next, outwardSign);
    const intersection2 = intersectInfiniteLines(
      addOffset(previous, incomingNormal, distanceMeters),
      addOffset(current, incomingNormal, distanceMeters),
      addOffset(current, outgoingNormal, distanceMeters),
      addOffset(next, outgoingNormal, distanceMeters)
    );
    const fallback = addOffset(current, outgoingNormal, distanceMeters);
    offsetVertices.push(clampMiterVertex(current, intersection2 ?? fallback, distanceMeters));
  }
  return offsetVertices.map(roundPoint);
}
function closeLocalRing(points) {
  if (points.length === 0) {
    return [];
  }
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  if (firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y) {
    return points;
  }
  return [...points, { ...firstPoint }];
}
function calculatePolygonOverlapAreaSquareMeters(a, b) {
  if (a.length < 3 || b.length < 3) {
    return 0;
  }
  if (!doBoundingBoxesOverlap(a, b)) {
    return 0;
  }
  const geometry = (0, import_martinez_polygon_clipping.intersection)(toMartinezPolygon(a), toMartinezPolygon(b));
  if (!geometry) {
    return 0;
  }
  const polygons = isPolygonGeometry(geometry) ? [geometry] : geometry;
  let totalArea = 0;
  for (const polygon of polygons) {
    totalArea += getMartinezPolygonArea(polygon);
  }
  return Math.max(0, totalArea);
}
function toMartinezPolygon(points) {
  return [closeLocalRing(points).map((point) => [point.x, point.y])];
}
function doBoundingBoxesOverlap(a, b) {
  const boxA = getBoundingBox(a);
  const boxB = getBoundingBox(b);
  return boxA.minX <= boxB.maxX && boxA.maxX >= boxB.minX && boxA.minY <= boxB.maxY && boxA.maxY >= boxB.minY;
}
function getBoundingBox(points) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, minY, maxX, maxY };
}
function isPolygonGeometry(geometry) {
  const firstRing = geometry[0];
  const firstPosition = firstRing?.[0];
  return Array.isArray(firstPosition) && typeof firstPosition[0] === "number";
}
function getMartinezPolygonArea(polygon) {
  if (polygon.length === 0) {
    return 0;
  }
  let area = Math.abs(getRingShoelaceArea(polygon[0]));
  for (let index = 1; index < polygon.length; index += 1) {
    area -= Math.abs(getRingShoelaceArea(polygon[index]));
  }
  return area;
}
function getRingShoelaceArea(ring) {
  let sum2 = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const [currentX, currentY] = ring[index];
    const [nextX, nextY] = ring[(index + 1) % ring.length];
    sum2 += currentX * nextY - nextX * currentY;
  }
  return sum2 / 2;
}
function isPointInsidePolygonOrOnBoundary(point, polygon, tolerance) {
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (isPointOnSegment(point, start, end, tolerance)) {
      return true;
    }
  }
  let inside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects = current.y > point.y !== previous.y > point.y && point.x < (previous.x - current.x) * (point.y - current.y) / (previous.y - current.y) + current.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}
function arePolygonSegmentsInsidePolygon(candidate, parent, tolerance) {
  const candidateRing = closeLocalRing(candidate);
  for (let index = 0; index < candidateRing.length - 1; index += 1) {
    if (!isSegmentInsidePolygonOrOnBoundary(candidateRing[index], candidateRing[index + 1], parent, tolerance)) {
      return false;
    }
  }
  return true;
}
function isSegmentInsidePolygonOrOnBoundary(start, end, parent, tolerance) {
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };
  if (!isPointInsidePolygonOrOnBoundary(midpoint, parent, tolerance)) {
    return false;
  }
  const parentRing = closeLocalRing(parent);
  for (let index = 0; index < parentRing.length - 1; index += 1) {
    const parentStart = parentRing[index];
    const parentEnd = parentRing[index + 1];
    if (segmentsProperlyIntersect(start, end, parentStart, parentEnd) && !isSegmentIntersectionWithinBoundaryTolerance(start, end, parentStart, parentEnd, tolerance)) {
      return false;
    }
  }
  return true;
}
function isSegmentIntersectionWithinBoundaryTolerance(candidateStart, candidateEnd, parentStart, parentEnd, tolerance) {
  return getDistance(candidateStart, projectPointToSegment(candidateStart, parentStart, parentEnd)) <= tolerance || getDistance(candidateEnd, projectPointToSegment(candidateEnd, parentStart, parentEnd)) <= tolerance;
}
function segmentsProperlyIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const firstToSecondStart = getSignedArea(firstStart, firstEnd, secondStart);
  const firstToSecondEnd = getSignedArea(firstStart, firstEnd, secondEnd);
  const secondToFirstStart = getSignedArea(secondStart, secondEnd, firstStart);
  const secondToFirstEnd = getSignedArea(secondStart, secondEnd, firstEnd);
  if (Math.abs(firstToSecondStart) <= GEOMETRY_EPSILON || Math.abs(firstToSecondEnd) <= GEOMETRY_EPSILON || Math.abs(secondToFirstStart) <= GEOMETRY_EPSILON || Math.abs(secondToFirstEnd) <= GEOMETRY_EPSILON) {
    return false;
  }
  return firstToSecondStart * firstToSecondEnd < 0 && secondToFirstStart * secondToFirstEnd < 0;
}
function isPointOnSegment(point, start, end, tolerance) {
  const projectedPoint = projectPointToSegment(point, start, end);
  const distance4 = getDistance(point, projectedPoint);
  return distance4 <= tolerance;
}
function projectPointToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return { ...start };
  }
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return {
    x: start.x + ratio * dx,
    y: start.y + ratio * dy
  };
}
function getDistance(firstPoint, secondPoint) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}
function getSignedArea(firstPoint, secondPoint, thirdPoint) {
  return (secondPoint.x - firstPoint.x) * (thirdPoint.y - firstPoint.y) - (secondPoint.y - firstPoint.y) * (thirdPoint.x - firstPoint.x);
}
function getPolygonSignedArea(points) {
  let sum2 = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum2 += current.x * next.y - next.x * current.y;
  }
  return sum2 / 2;
}
function getOutwardEdgeNormal(start, end, outwardSign) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length <= MIN_VECTOR_LENGTH_METERS) {
    return { x: 0, y: 0 };
  }
  return { x: dy / length * outwardSign, y: -dx / length * outwardSign };
}
function addOffset(point, normal, distance4) {
  return { x: point.x + normal.x * distance4, y: point.y + normal.y * distance4 };
}
function intersectInfiniteLines(firstStart, firstEnd, secondStart, secondEnd) {
  const firstDx = firstEnd.x - firstStart.x;
  const firstDy = firstEnd.y - firstStart.y;
  const secondDx = secondEnd.x - secondStart.x;
  const secondDy = secondEnd.y - secondStart.y;
  const denominator = firstDx * secondDy - firstDy * secondDx;
  if (Math.abs(denominator) < POLYGON_OFFSET_PARALLEL_EPSILON) {
    return null;
  }
  const ratio = ((secondStart.x - firstStart.x) * secondDy - (secondStart.y - firstStart.y) * secondDx) / denominator;
  return { x: firstStart.x + ratio * firstDx, y: firstStart.y + ratio * firstDy };
}
function clampMiterVertex(corner, candidate, distance4) {
  const dx = candidate.x - corner.x;
  const dy = candidate.y - corner.y;
  const miterLength = Math.hypot(dx, dy);
  const maxMiterLength = Math.abs(distance4) * POLYGON_OFFSET_MITER_LIMIT;
  if (miterLength <= maxMiterLength || miterLength <= MIN_VECTOR_LENGTH_METERS) {
    return candidate;
  }
  const scale2 = maxMiterLength / miterLength;
  return { x: corner.x + dx * scale2, y: corner.y + dy * scale2 };
}
function roundPoint(point) {
  return {
    x: Math.round(point.x * 100) / 100,
    y: Math.round(point.y * 100) / 100
  };
}

// ../../Scaffolda-public/src/features/scaffolda/lib/siteZoneBuilding.ts
var BUILDING_ZONE_MIN_FLOORS = 0;
var BUILDING_ZONE_MAX_FLOORS = 5;
var DEFAULT_BUILDING_ZONE_FLOORS = 2;
var NON_BUILDING_FACILITY_TYPE_IDS = /* @__PURE__ */ new Set([
  "training-zone",
  "parking-zone",
  "vehicle-parking-zone",
  "fence-boundary",
  "parade-ground",
  "training-place",
  "parking-lot"
]);
function isNonBuildingFacilityType(facilityTypeId) {
  return typeof facilityTypeId === "string" && NON_BUILDING_FACILITY_TYPE_IDS.has(facilityTypeId);
}
function getDefaultZoneFloors(zone) {
  if (zone.kind !== "facility" || isRoadZone(zone)) {
    return void 0;
  }
  return isNonBuildingFacilityType(zone.facilityTypeId) ? BUILDING_ZONE_MIN_FLOORS : DEFAULT_BUILDING_ZONE_FLOORS;
}
function normalizeZoneFloors(value, zone) {
  const defaultFloors = getDefaultZoneFloors(zone);
  if (defaultFloors === void 0) {
    return void 0;
  }
  if (!Number.isFinite(value)) {
    return defaultFloors;
  }
  return clampInteger(Number(value), BUILDING_ZONE_MIN_FLOORS, BUILDING_ZONE_MAX_FLOORS);
}
function isBuildingExtrusionZone(zone) {
  const floors = resolveBuildingZoneFloors(zone);
  return !isRoadZone(zone) && !isNonBuildingFacilityType(zone.facilityTypeId) && typeof floors === "number" && floors > BUILDING_ZONE_MIN_FLOORS;
}
function resolveBuildingZoneFloors(zone) {
  if (isRoadZone(zone) || isNonBuildingFacilityType(zone.facilityTypeId)) {
    return void 0;
  }
  if (zone.kind === "category") {
    return BUILDING_ZONE_MIN_FLOORS;
  }
  return normalizeZoneFloors(zone.floors, zone);
}
function clampInteger(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

// ../../Scaffolda-public/src/features/scaffolda/lib/projectCost.ts
var DEFAULT_PROJECT_COST_CONFIG = {
  designFeePerM2: 76e3
};
var PERMIT_FEE_TIERS = [
  { maxFloorAreaM2: 500, feeKrw: 25e5 },
  { maxFloorAreaM2: 1e3, feeKrw: 3e6 },
  { maxFloorAreaM2: 2e3, feeKrw: 35e5 },
  { maxFloorAreaM2: 5e3, feeKrw: 4e6 }
];
var PERMIT_FEE_ABOVE_TOP_TIER_KRW = 6e6;
function resolveAutoPermitFeeKrw(floorAreaM2) {
  const area = Number.isFinite(floorAreaM2) ? floorAreaM2 : 0;
  const tier = PERMIT_FEE_TIERS.find((item) => area <= item.maxFloorAreaM2);
  return tier ? tier.feeKrw : PERMIT_FEE_ABOVE_TOP_TIER_KRW;
}
function computeProjectCost(input) {
  const config = resolveProjectCostConfig(input.config);
  let floorAreaM2 = 0;
  for (const zone of input.zones) {
    if (isRoadZone(zone) || zone.kind === "category") {
      continue;
    }
    floorAreaM2 += createZoneAreaMetrics(zone.points, zone.floors).totalFloorAreaSquareMeters;
  }
  const distinctEarthwork = /* @__PURE__ */ new Set();
  let pendingEarthworkCount = 0;
  for (const zone of input.zones) {
    if (!isBuildingExtrusionZone(zone)) {
      continue;
    }
    const result = input.earthworkByZoneId[zone.id];
    if (result) {
      distinctEarthwork.add(result);
    } else {
      pendingEarthworkCount += 1;
    }
  }
  let hardCostKrw = 0;
  for (const result of distinctEarthwork) {
    hardCostKrw += result.totalCostKrw;
  }
  hardCostKrw = Math.round(hardCostKrw);
  const designFeeKrw = Math.round(floorAreaM2 * config.designFeePerM2);
  const permitFeeAuto = config.permitFeeKrw === void 0;
  const permitFeeKrw = permitFeeAuto ? resolveAutoPermitFeeKrw(floorAreaM2) : Math.round(config.permitFeeKrw);
  return {
    hardCostKrw,
    designFeeKrw,
    permitFeeKrw,
    permitFeeAuto,
    totalKrw: hardCostKrw + designFeeKrw + permitFeeKrw,
    floorAreaM2: Math.round(floorAreaM2 * 10) / 10,
    pendingEarthworkCount
  };
}
function resolveProjectCostConfig(partial) {
  const designFeePerM2 = partial?.designFeePerM2;
  const permitFeeKrw = partial?.permitFeeKrw;
  return {
    designFeePerM2: isNonNegativeNumber(designFeePerM2) ? designFeePerM2 : DEFAULT_PROJECT_COST_CONFIG.designFeePerM2,
    permitFeeKrw: isNonNegativeNumber(permitFeeKrw) ? permitFeeKrw : void 0
  };
}
function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function formatKrwShort(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 1e8) {
    return `${Math.round(value / 1e7) / 10}\uC5B5`;
  }
  return `${Math.round(value / 1e4).toLocaleString("ko-KR")}\uB9CC`;
}

// ../../Scaffolda-public/src/features/scaffolda/lib/facilityCatalog.ts
var FACILITY_CATEGORY_LABELS = {
  command: "\uC9C0\uD718/\uC0AC\uBB34 \uAD6C\uC5ED",
  living: "\uC0DD\uD65C \uAD6C\uC5ED",
  training: "\uAD50\uC721/\uD6C8\uB828 \uAD6C\uC5ED",
  logistics: "\uBCF4\uAE09/\uCC3D\uACE0 \uAD6C\uC5ED",
  vehicle: "\uCC28\uB7C9/\uC815\uBE44 \uAD6C\uC5ED",
  care: "\uC758\uBB34/\uC704\uC0DD \uAD6C\uC5ED",
  entry: "\uCD9C\uC785/\uACBD\uACC4 \uAD6C\uC5ED",
  infrastructure: "\uC778\uD504\uB77C",
  other: "\uAE30\uD0C0"
};
var FACILITY_CATALOG_SPECS = [
  {
    id: "command-zone",
    name: "\uC9C0\uD718 \uAD6C\uC5ED",
    category: "command",
    description: "\uC9C0\uD718\uD1B5\uC81C\uC2E4 \uB4F1 \uC9C0\uD718 \uAE30\uB2A5\uC744 \uC218\uC6A9\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 20,
    defaultFloors: 1,
    // 부대 밖이라면 업무시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#2563eb"
  },
  {
    id: "office-zone",
    name: "\uC0AC\uBB34 \uAD6C\uC5ED",
    category: "command",
    description: "\uB300\uB300\uC7A5\uC2E4 \uB4F1 \uC0AC\uBB34 \uAE30\uB2A5\uC744 \uC218\uC6A9\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 10,
    defaultFloors: 1,
    // 부대 밖이라면 업무시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#2563eb"
  },
  {
    id: "living-zone",
    name: "\uC0DD\uD65C \uAD6C\uC5ED",
    category: "living",
    description: "\uC0DD\uD65C\uAD00 \uB4F1 \uC778\uC6D0 \uC0DD\uD65C \uACF5\uAC04\uC744 \uC218\uC6A9\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 100,
    defaultFloors: 2,
    // 부대 밖이라면 공동주택(기숙사). 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#16a34a"
  },
  {
    id: "welfare-zone",
    name: "\uBCF5\uC9C0 \uAD6C\uC5ED",
    category: "living",
    description: "PX \uB4F1 \uBCF5\uC9C0 \uAE30\uB2A5\uC744 \uC218\uC6A9\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 40,
    defaultFloors: 1,
    // 부대 밖이라면 제2종 근린생활시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#16a34a"
  },
  {
    id: "hygiene-zone",
    name: "\uC704\uC0DD \uAD6C\uC5ED",
    category: "living",
    description: "\uC0E4\uC6CC\uC2E4\uC744 \uC218\uC6A9\uD558\uB294 \uC0DD\uD65C \uC704\uC0DD \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 30,
    defaultFloors: 1,
    buildingUseId: "defense",
    color: "#16a34a"
  },
  {
    id: "education-zone",
    name: "\uAD50\uC721 \uAD6C\uC5ED",
    category: "training",
    description: "\uAC15\uC758\uC640 \uC9D1\uD569 \uAD50\uC721\uC744 \uC218\uD589\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 40,
    defaultFloors: 1,
    // 부대 밖이라면 교육연구시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#f59e0b"
  },
  {
    id: "training-zone",
    name: "\uD6C8\uB828 \uAD6C\uC5ED",
    category: "training",
    description: "\uC57C\uC678 \uB610\uB294 \uC2E4\uB0B4 \uD6C8\uB828 \uD65C\uB3D9\uC744 \uC218\uD589\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 100,
    defaultFloors: 1,
    // 부대 밖이라면 운동시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#f59e0b"
  },
  {
    id: "storage-zone",
    name: "\uCC3D\uACE0 \uAD6C\uC5ED",
    category: "logistics",
    description: "\uD0C4\uC57D\uACE0 \uB4F1 \uBCF4\uAE09\uD488\uACFC \uC7A5\uBE44\uB97C \uBCF4\uAD00\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 20,
    defaultFloors: 1,
    // 부대 밖이라면 창고시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#7c3aed"
  },
  {
    id: "parking-zone",
    name: "\uC8FC\uCC28 \uAD6C\uC5ED",
    category: "vehicle",
    description: "\uCC28\uB7C9 \uC8FC\uCC28\uC640 \uB300\uAE30 \uACF5\uAC04\uC744 \uC218\uC6A9\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 40,
    defaultFloors: 1,
    // 부대 밖이라면 자동차 관련 시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#0f766e"
  },
  {
    id: "vehicle-parking-zone",
    name: "\uAD70\uC6A9 \uC8FC\uCC28 \uAD6C\uC5ED",
    category: "vehicle",
    description: "\uAD70\uC6A9 \uCC28\uB7C9 \uC8FC\uCC28\uB97C \uC704\uD55C \uD655\uC7A5\uD615 \uAD6C\uD68D\uACFC \uB113\uC740 \uCC28\uB85C\uB97C \uAC16\uCD98 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 40,
    defaultFloors: 1,
    // 부대 밖이라면 자동차 관련 시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#0f766e"
  },
  {
    id: "maintenance-zone",
    name: "\uC815\uBE44 \uAD6C\uC5ED",
    category: "vehicle",
    description: "\uCC28\uB7C9\uACFC \uC7A5\uBE44 \uC815\uBE44 \uAE30\uB2A5\uC744 \uC218\uC6A9\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 20,
    defaultFloors: 1,
    // 부대 밖이라면 자동차 관련 시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#0f766e"
  },
  {
    id: "medical-zone",
    name: "\uC758\uBB34 \uAD6C\uC5ED",
    category: "care",
    description: "\uC9C4\uB8CC\uC640 \uC751\uAE09 \uCC98\uCE58\uB97C \uC218\uD589\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 20,
    defaultFloors: 1,
    // 부대 밖이라면 의료시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#dc2626"
  },
  {
    id: "entry-zone",
    name: "\uCD9C\uC785 \uAD6C\uC5ED",
    category: "entry",
    description: "\uCD9C\uC785 \uD1B5\uC81C\uC640 \uBC29\uBB38\uC790 \uD655\uC778\uC744 \uC218\uD589\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 10,
    defaultFloors: 1,
    buildingUseId: "defense",
    color: "#475569"
  },
  {
    id: "security-zone",
    name: "\uACBD\uACC4 \uAD6C\uC5ED",
    category: "entry",
    description: "\uCD08\uC18C\uC640 \uAC10\uC2DC \uAE30\uB2A5\uC744 \uC218\uC6A9\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 10,
    defaultFloors: 1,
    buildingUseId: "defense",
    color: "#475569"
  },
  {
    id: "fence-boundary",
    name: "\uB2F4\uC7A5/\uACBD\uACC4",
    category: "entry",
    description: "\uBD80\uC9C0 \uC678\uACFD\uC758 \uB2F4\uC7A5\uACFC \uACBD\uACC4\uC120\uC744 \uD45C\uC2DC\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 10,
    defaultFloors: 1,
    color: "#475569"
  },
  {
    id: "infrastructure-zone",
    name: "\uC778\uD504\uB77C \uAD6C\uC5ED",
    category: "infrastructure",
    description: "\uBCF4\uC77C\uB7EC\uC2E4 \uB4F1 \uAE30\uBC18 \uC124\uBE44\uB97C \uC218\uC6A9\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 20,
    defaultFloors: 1,
    // 부대 밖이라면 발전시설. 부지 안이라 국방·군사시설로 본다.
    buildingUseId: "defense",
    color: "#0891b2"
  },
  {
    id: "road",
    name: "\uB3C4\uB85C",
    category: "other",
    description: "\uCC28\uB7C9\uACFC \uBCF4\uD589 \uB3D9\uC120\uC744 \uC704\uD55C \uB3C4\uB85C\uC785\uB2C8\uB2E4.",
    defaultCapacity: 10,
    defaultFloors: 1,
    color: "#000000"
  },
  {
    id: "fence",
    name: "\uB2F4\uC7A5",
    category: "other",
    description: "\uBD80\uB300 \uACBD\uACC4\uC640 \uB0B4\uBD80 \uAD6C\uD68D\uC744 \uB098\uB204\uB294 \uCF58\uD06C\uB9AC\uD2B8 \uB2F4\uC7A5\uC785\uB2C8\uB2E4. \uC911\uC2EC\uC120\uC744 \uADF8\uB824 \uBC30\uCE58\uD569\uB2C8\uB2E4.",
    defaultCapacity: 10,
    defaultFloors: 1,
    color: "#8b9097"
  },
  {
    id: "other-zone",
    name: "\uAE30\uD0C0 \uAD6C\uC5ED",
    category: "other",
    description: "\uBD84\uB958\uB418\uC9C0 \uC54A\uC740 \uAE30\uD0C0 \uAE30\uB2A5\uC744 \uC218\uC6A9\uD558\uB294 \uAD6C\uC5ED\uC785\uB2C8\uB2E4.",
    defaultCapacity: 10,
    defaultFloors: 1,
    buildingUseId: "defense",
    color: "#64748b"
  }
];
var FACILITY_CATALOG = FACILITY_CATALOG_SPECS.map(createFacilityType);
function findFacilityTypeById(facilityTypeId) {
  return FACILITY_CATALOG.find((facility) => facility.id === facilityTypeId);
}
function groupFacilitiesByCategory(facilities = FACILITY_CATALOG) {
  const categoryOrder = Object.keys(FACILITY_CATEGORY_LABELS);
  return categoryOrder.map((category) => ({
    category,
    facilities: facilities.filter((facility) => facility.category === category)
  })).filter((group) => group.facilities.length > 0);
}
function createFacilityType(spec) {
  const dimensions = createRecommendedZoneDimensions(spec.defaultCapacity);
  return {
    ...spec,
    defaultWidth: dimensions.recommendedWidthMeters,
    defaultDepth: dimensions.recommendedDepthMeters
  };
}

// ../../Scaffolda-public/src/features/scaffolda/lib/scaffoldaError.ts
function logScaffoldaError(code, context) {
  const error = context.error instanceof Error ? context.error : void 0;
  const log = {
    code,
    input: sanitizeLogValue(context.input),
    output: sanitizeLogValue(context.output),
    stacktrace: error?.stack,
    errorMessage: error?.message ?? String(context.error ?? ""),
    upstreamApiErrorMessage: context.upstreamApiErrorMessage
  };
  console.error("[ScaffoldaError]", log);
}
function sanitizeLogValue(value) {
  if (value === void 0) {
    return null;
  }
  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message
    };
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

// ../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/designRequirements.ts
var UNIT_TEMPLATES = [
  "headquarters",
  "infantry",
  "armor",
  "maintenance",
  "generic"
];
var UNIT_TEMPLATE_LABELS = {
  headquarters: "\uBCF8\uBD80\uBD80\uB300",
  infantry: "\uBCF4\uBCD1\uBD80\uB300",
  armor: "\uC804\uCC28\uBD80\uB300",
  maintenance: "\uC815\uBE44\uBD80\uB300",
  generic: "\uC77C\uBC18\uBD80\uB300"
};
var MODULE_IDS = ["guard", "training", "maintenance", "supply", "medical", "parking"];
var MODULE_WEIGHTS = [0.5, 1, 1.5];
var ADJUST_TARGETS = [...MODULE_IDS, "command", "living"];
var MODULE_LABELS = {
  guard: "\uACBD\uACC4\uCD08\uC18C",
  training: "\uAD50\uC721/\uD6C8\uB828",
  maintenance: "\uC218\uC1A1/\uC815\uBE44",
  supply: "\uBCF4\uAE09",
  medical: "\uC758\uBB34",
  parking: "\uC8FC\uCC28"
};
var CORE_LABELS = { command: "\uC9C0\uD718/\uC0AC\uBB34", living: "\uC0DD\uD65C\uC2DC\uC124" };
var AREA_PER_PERSON_SQUARE_METERS = DEFAULT_AREA_PER_PERSON_M2;
var SITE_AREA_PER_PERSON_SQUARE_METERS = AREA_PER_PERSON_SQUARE_METERS / 0.08;
function defaultModulesFor(template) {
  const modules = Object.fromEntries(
    MODULE_IDS.map((id) => [id, { enabled: true, weight: 1 }])
  );
  if (template === "armor") modules.maintenance = { enabled: true, weight: 1.5 };
  if (template === "infantry") modules.training = { enabled: true, weight: 1.5 };
  if (template === "headquarters") modules.training = { enabled: false, weight: 1 };
  return modules;
}
var FALLBACK_PERSONNEL = {
  headquarters: { total: 150, resident: 100 },
  infantry: { total: 400, resident: 300 },
  armor: { total: 300, resident: 200 },
  maintenance: { total: 200, resident: 150 },
  generic: { total: 300, resident: 200 }
};
function createDesignRequirements(partial) {
  const unitTemplate = partial.unitTemplate ?? "generic";
  const fallback = FALLBACK_PERSONNEL[unitTemplate];
  return {
    unitTemplate,
    totalPersonnel: partial.totalPersonnel ?? fallback.total,
    residentPersonnel: partial.residentPersonnel ?? fallback.resident,
    notes: partial.notes,
    modules: partial.modules ?? defaultModulesFor(unitTemplate),
    coreWeights: partial.coreWeights ?? { command: 1, living: 1 },
    assumed: partial.assumed ?? []
  };
}
function applyModuleAdjustment(requirements, adjustment) {
  if (adjustment.target === "command" || adjustment.target === "living") {
    if (adjustment.weight === void 0) return requirements;
    return {
      ...requirements,
      coreWeights: { ...requirements.coreWeights, [adjustment.target]: adjustment.weight }
    };
  }
  const current = requirements.modules[adjustment.target];
  return {
    ...requirements,
    modules: {
      ...requirements.modules,
      [adjustment.target]: {
        enabled: adjustment.enabled ?? current.enabled,
        weight: adjustment.weight ?? current.weight
      }
    }
  };
}
function buildRequirementsResponseSchema(questionIds) {
  return {
    type: "object",
    properties: {
      reply: { type: "string" },
      requirements: {
        type: "object",
        properties: {
          unitTemplate: { type: "string", enum: UNIT_TEMPLATES },
          totalPersonnel: { type: "integer" },
          residentPersonnel: { type: "integer" },
          notes: { type: "string" }
        },
        required: ["unitTemplate", "totalPersonnel", "residentPersonnel"]
      },
      // 한 턴에 던질 질문은 최대 2개로 제한한다(스펙 §3).
      askQuestionIds: { type: "array", items: { type: "string", enum: questionIds }, maxItems: 2 },
      moduleAdjustments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            target: { type: "string", enum: ADJUST_TARGETS },
            enabled: { type: "boolean" },
            weight: { type: "number", enum: MODULE_WEIGHTS }
          },
          required: ["target"]
        }
      }
    },
    required: ["reply", "requirements", "askQuestionIds", "moduleAdjustments"]
  };
}
function resolveDesignTurn(raw, knownQuestionIds = []) {
  const record = isRecord3(raw) ? raw : {};
  const reply = typeof record.reply === "string" ? record.reply : "";
  const rawRequirements = isRecord3(record.requirements) ? record.requirements : {};
  const totalPersonnel = toPositiveInt(rawRequirements.totalPersonnel);
  const residentPersonnel = toPositiveInt(rawRequirements.residentPersonnel);
  const extracted = {
    unitTemplate: toUnitTemplate(rawRequirements.unitTemplate),
    totalPersonnel,
    // 상주가 총원을 넘으면 총원으로 보정(총원 미상이면 보정 불가 — 그대로 둔다).
    residentPersonnel: residentPersonnel !== null && totalPersonnel !== null ? Math.min(residentPersonnel, totalPersonnel) : residentPersonnel,
    notes: typeof rawRequirements.notes === "string" ? rawRequirements.notes : void 0
  };
  const rawIds = Array.isArray(record.askQuestionIds) ? record.askQuestionIds : [];
  const validIds = rawIds.filter(
    (id) => typeof id === "string" && knownQuestionIds.includes(id)
  );
  const askQuestionIds = validIds.slice(0, 2);
  const droppedIds = rawIds.filter((id) => !validIds.includes(id));
  if (droppedIds.length > 0) {
    logScaffoldaError("SCAFFOLDA_AI_TURN_IGNORED_FIELD", {
      input: { field: "askQuestionIds", dropped: droppedIds }
    });
  }
  const rawAdjustments = Array.isArray(record.moduleAdjustments) ? record.moduleAdjustments : [];
  const moduleAdjustments = [];
  const droppedAdjustments = [];
  for (const item of rawAdjustments) {
    if (!isRecord3(item) || !ADJUST_TARGETS.includes(item.target)) {
      droppedAdjustments.push(item);
      continue;
    }
    const adjustment = { target: item.target };
    if (typeof item.enabled === "boolean") adjustment.enabled = item.enabled;
    if (MODULE_WEIGHTS.includes(item.weight)) {
      adjustment.weight = item.weight;
    }
    moduleAdjustments.push(adjustment);
  }
  if (droppedAdjustments.length > 0) {
    logScaffoldaError("SCAFFOLDA_AI_TURN_IGNORED_FIELD", {
      input: { field: "moduleAdjustments", dropped: droppedAdjustments }
    });
  }
  return { reply, extracted, askQuestionIds, moduleAdjustments };
}
function mergeTurnRequirements(current, turn) {
  let next;
  if (current === null) {
    const template = turn.extracted.unitTemplate ?? "generic";
    const fallback = FALLBACK_PERSONNEL[template];
    const assumed = [];
    if (turn.extracted.totalPersonnel === null) {
      assumed.push(`\uCD1D\uC6D0 ${fallback.total}\uBA85(\uD1B5\uC0C1 ${UNIT_TEMPLATE_LABELS[template]} \uADDC\uBAA8\uB85C \uCD94\uC815)`);
    }
    if (turn.extracted.residentPersonnel === null) {
      assumed.push(`\uC0C1\uC8FC ${fallback.resident}\uBA85(\uD1B5\uC0C1 ${UNIT_TEMPLATE_LABELS[template]} \uADDC\uBAA8\uB85C \uCD94\uC815)`);
    }
    next = createDesignRequirements({
      unitTemplate: template,
      totalPersonnel: turn.extracted.totalPersonnel ?? fallback.total,
      residentPersonnel: turn.extracted.residentPersonnel ?? fallback.resident,
      notes: turn.extracted.notes,
      assumed
    });
  } else {
    next = {
      ...current,
      unitTemplate: turn.extracted.unitTemplate ?? current.unitTemplate,
      totalPersonnel: turn.extracted.totalPersonnel ?? current.totalPersonnel,
      residentPersonnel: turn.extracted.residentPersonnel ?? current.residentPersonnel,
      notes: turn.extracted.notes ?? current.notes,
      // 사용자가 실제 값을 주면 해당 추정 표기를 걷어낸다.
      assumed: current.assumed.filter(
        (line) => !(turn.extracted.totalPersonnel !== null && line.startsWith("\uCD1D\uC6D0")) && !(turn.extracted.residentPersonnel !== null && line.startsWith("\uC0C1\uC8FC"))
      )
    };
  }
  for (const adjustment of turn.moduleAdjustments) {
    next = applyModuleAdjustment(next, adjustment);
  }
  return next;
}
var INTERROGATIVE_ENDING = /(까요|나요|가요|는지요|니까)[.。\s]*$/;
function isInterrogativeText(text) {
  const trimmed = text.trim();
  return /[?？]/.test(trimmed) || INTERROGATIVE_ENDING.test(trimmed);
}
function toPositiveInt(value) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }
  return Math.round(numberValue);
}
function toUnitTemplate(value) {
  return typeof value === "string" && UNIT_TEMPLATES.includes(value) ? value : null;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/buildingProgram.ts
var COMMAND_TOTAL_RATIO = 0.3;
var COMMAND_SPLIT = 0.6;
var WELFARE_RATIO = 0.15;
var HYGIENE_RATIO = 0.2;
var SATELLITE_RATIO = 0.1;
var LIVING_GROUP_SIZE = 150;
var LIVING_GROUP_MAX = 6;
var TRAINING_RATIO = 0.1;
var LOGISTICS_RATIO = 0.1;
var VEHICLE_RATIO_DEFAULT = 0.1;
var VEHICLE_RATIO_INFANTRY = 0.15;
var VEHICLE_RATIO_HEAVY = 0.2;
var MAINTENANCE_MAX_PER_UNIT = 300;
var MEDICAL_MAX_PER_UNIT = 300;
var MAINTENANCE_FIXED_FLOORS = 3;
var INFRA_FIXED_FLOORS = 3;
var MEDICAL_RATIO = 0.1;
var ENTRY_RATIO = 0.05;
var ENTRY_MIN_PERSONNEL = 10;
var ENTRY_MAX_PERSONNEL = 80;
var ENTRY_FIXED_FLOORS = 1;
var INFRA_RATIO = 0.1;
var GUARD_POST_PERSONNEL = 10;
var GUARD_POST_FIXED_FLOORS = 3;
var VEHICLE_HEAVY_KEYWORDS = /전차|기갑|장갑|차량|수송|정비/;
function unit(key, category, facilityTypeId, label, personnel, extra) {
  return {
    key,
    category,
    facilityTypeId,
    label,
    personnel,
    floorAreaM2: Math.round(personnel * AREA_PER_PERSON_SQUARE_METERS * 10) / 10,
    ...extra
  };
}
function numberedLabel(base, index, count) {
  return count > 1 ? `${base} ${index + 1}` : base;
}
function satelliteUnits(host, groupKey) {
  const personnel = Math.max(1, Math.round(host.personnel * SATELLITE_RATIO));
  return [
    unit(`welfare-${host.key}`, "living", "welfare-zone", `${host.label} \uBCF5\uC9C0`, personnel, {
      groupKey
    })
  ];
}
function splitEvenly(total, count) {
  if (total <= 0 || count <= 0) {
    return [];
  }
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}
function splitPersonnel(total, maxPerUnit) {
  if (total <= 0) {
    return [];
  }
  return splitEvenly(total, Math.max(1, Math.ceil(total / maxPerUnit)));
}
function buildProgram(requirements, entryCount = 1) {
  const total = Math.max(0, Math.round(requirements.totalPersonnel));
  const resident = Math.max(0, Math.round(requirements.residentPersonnel));
  const { modules, coreWeights } = requirements;
  const units = [];
  const notes = [];
  if (total <= 0) {
    return { units, notes: ["\uCD1D\uC6D0\uC774 0\uC774\uB77C \uD504\uB85C\uADF8\uB7A8\uC744 \uB9CC\uB4E4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."] };
  }
  const gateCount = Math.max(1, Math.round(entryCount));
  const entryPersonnel = Math.min(
    ENTRY_MAX_PERSONNEL,
    Math.max(ENTRY_MIN_PERSONNEL, Math.round(total * ENTRY_RATIO))
  );
  for (let index = 0; index < gateCount; index += 1) {
    units.push(
      unit(`entry-${index + 1}`, "entry", "entry-zone", numberedLabel("\uCD9C\uC785 \uAD6C\uC5ED", index, gateCount), entryPersonnel, {
        fixedFloors: ENTRY_FIXED_FLOORS
      })
    );
  }
  const commandTotal = Math.round(total * COMMAND_TOTAL_RATIO * coreWeights.command);
  const commandUnit = unit("command-1", "command", "command-zone", "\uC9C0\uD718 \uAD6C\uC5ED", Math.round(commandTotal * COMMAND_SPLIT), {
    groupKey: "command-g1"
  });
  units.push(commandUnit, ...satelliteUnits(commandUnit, "command-g1"));
  const officeUnit = unit(
    "office-1",
    "command",
    "office-zone",
    "\uC0AC\uBB34 \uAD6C\uC5ED",
    commandTotal - Math.round(commandTotal * COMMAND_SPLIT),
    { groupKey: "office-g1" }
  );
  units.push(officeUnit, ...satelliteUnits(officeUnit, "office-g1"));
  const sizedResident = Math.round(resident * coreWeights.living);
  if (resident <= 0) {
    notes.push("\uC0C1\uC8FC \uC778\uC6D0\uC774 0\uC774\uB77C \uC0DD\uD65C-\uBCF5\uC9C0-\uC704\uC0DD \uAD6C\uC5ED\uC744 \uB9CC\uB4E4\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
  }
  const livingGroupCount = sizedResident > 0 ? Math.min(LIVING_GROUP_MAX, Math.max(1, Math.ceil(sizedResident / LIVING_GROUP_SIZE))) : 0;
  const livingSplit = splitEvenly(sizedResident, livingGroupCount);
  for (let index = 0; index < livingGroupCount; index += 1) {
    const groupKey = `living-g${index + 1}`;
    const living = livingSplit[index] ?? 0;
    units.push(
      unit(`living-${index + 1}`, "living", "living-zone", numberedLabel("\uC0DD\uD65C \uAD6C\uC5ED", index, livingGroupCount), living, {
        groupKey,
        attachRequired: true
      })
    );
    units.push(
      unit(`welfare-${index + 1}`, "living", "welfare-zone", numberedLabel("\uBCF5\uC9C0 \uAD6C\uC5ED", index, livingGroupCount), Math.max(1, Math.round(living * WELFARE_RATIO)), {
        groupKey
      })
    );
    units.push(
      unit(`hygiene-${index + 1}`, "living", "hygiene-zone", numberedLabel("\uC704\uC0DD \uAD6C\uC5ED", index, livingGroupCount), Math.max(1, Math.round(living * HYGIENE_RATIO)), {
        groupKey,
        attachRequired: true
      })
    );
  }
  if (modules.medical.enabled) {
    const medicalSplit = splitPersonnel(
      Math.round(total * MEDICAL_RATIO * modules.medical.weight),
      MEDICAL_MAX_PER_UNIT
    );
    medicalSplit.forEach((personnel, index) => {
      const groupKey = `care-g${index + 1}`;
      const medicalUnit = unit(
        `medical-${index + 1}`,
        "care",
        "medical-zone",
        numberedLabel("\uC758\uBB34 \uAD6C\uC5ED", index, medicalSplit.length),
        personnel,
        { groupKey }
      );
      units.push(medicalUnit, ...satelliteUnits(medicalUnit, groupKey));
    });
  }
  if (modules.training.enabled) {
    const trainingTotal = Math.round(total * TRAINING_RATIO * modules.training.weight);
    notes.push(`\uAD50\uC721/\uD6C8\uB828 \uADDC\uBAA8\uB294 \uAE30\uBCF8\uAC12(\uCD1D\uC6D0 ${Math.round(TRAINING_RATIO * 100)}%)\uC744 \uC0AC\uC6A9\uD588\uC2B5\uB2C8\uB2E4.`);
    const educationUnit = unit("education-1", "training", "education-zone", "\uAD50\uC721 \uAD6C\uC5ED", Math.round(trainingTotal / 2), {
      groupKey: "training-g1"
    });
    units.push(educationUnit, ...satelliteUnits(educationUnit, "training-g1"));
    units.push(
      unit("training-1", "training", "training-zone", "\uD6C8\uB828 \uAD6C\uC5ED", trainingTotal - Math.round(trainingTotal / 2), {
        groupKey: "training-g1",
        fixedFloors: 1
        // 야외 훈련장(연병장·노지) 성격의 면 시설 — 고층화 대상이 아니다.
      })
    );
  }
  if (modules.supply.enabled) {
    units.push(
      unit("logistics-1", "logistics", "storage-zone", "\uCC3D\uACE0 \uAD6C\uC5ED", Math.round(total * LOGISTICS_RATIO * modules.supply.weight))
    );
  }
  if (modules.maintenance.enabled) {
    const vehicleRatio = resolveVehicleRatio(requirements) * modules.maintenance.weight;
    const maintenanceSplit = splitPersonnel(Math.round(total * vehicleRatio), MAINTENANCE_MAX_PER_UNIT);
    maintenanceSplit.forEach((personnel, index) => {
      const groupKey = `vehicle-g${index + 1}`;
      const maintenanceUnit = unit(
        `maintenance-${index + 1}`,
        "vehicle",
        "maintenance-zone",
        numberedLabel("\uC815\uBE44 \uAD6C\uC5ED", index, maintenanceSplit.length),
        personnel,
        { fixedFloors: MAINTENANCE_FIXED_FLOORS, groupKey }
      );
      units.push(maintenanceUnit, ...satelliteUnits(maintenanceUnit, groupKey));
    });
  }
  units.push(
    unit("infrastructure-1", "infrastructure", "infrastructure-zone", "\uC778\uD504\uB77C \uAD6C\uC5ED", Math.max(1, Math.round(total * INFRA_RATIO)), {
      fixedFloors: INFRA_FIXED_FLOORS
    })
  );
  return { units, notes };
}
function resolveVehicleRatio(requirements) {
  const byTemplate = requirements.unitTemplate === "armor" || requirements.unitTemplate === "maintenance" ? VEHICLE_RATIO_HEAVY : requirements.unitTemplate === "infantry" ? VEHICLE_RATIO_INFANTRY : VEHICLE_RATIO_DEFAULT;
  if (requirements.notes && VEHICLE_HEAVY_KEYWORDS.test(requirements.notes)) {
    return Math.max(byTemplate, VEHICLE_RATIO_HEAVY);
  }
  return byTemplate;
}
function splitInfraUnit(base, count) {
  const personnelParts = splitEvenly(base.personnel, Math.max(1, count));
  return personnelParts.map(
    (personnel, index) => unit(`${base.key.replace(/-\d+$/, "")}-${index + 1}`, base.category, base.facilityTypeId, numberedLabel("\uC778\uD504\uB77C \uAD6C\uC5ED", index, personnelParts.length), personnel, {
      fixedFloors: base.fixedFloors,
      groupKey: base.groupKey
    })
  );
}

// ../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/difficultyGrid.ts
var DEFAULT_CELL_SIZE_M = 8;
var FLAT_ELEVATION_RANGE_M = 0.01;
var SLOPE_REFERENCE = 0.5;
var HEATMAP_MIN_NORMALIZED = 0.15;
function buildDifficultyGrid(boundary, sampleGround, cellSizeM = DEFAULT_CELL_SIZE_M) {
  if (boundary.length < 3) {
    return null;
  }
  const xs = boundary.map((point) => point.x);
  const ys = boundary.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cols = Math.max(1, Math.ceil((maxX - minX) / cellSizeM));
  const rows = Math.max(1, Math.ceil((maxY - minY) / cellSizeM));
  const elevations = new Array(cols * rows).fill(NaN);
  let sampledCount = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const center = { x: minX + (i + 0.5) * cellSizeM, y: minY + (j + 0.5) * cellSizeM };
      if (!isPointInPolygon2(center, boundary)) {
        continue;
      }
      const elevationM = sampleGround(center);
      if (elevationM !== null && Number.isFinite(elevationM)) {
        elevations[j * cols + i] = elevationM;
        sampledCount += 1;
        minElevation = Math.min(minElevation, elevationM);
        maxElevation = Math.max(maxElevation, elevationM);
      }
    }
  }
  if (sampledCount === 0) {
    return null;
  }
  if (maxElevation - minElevation < FLAT_ELEVATION_RANGE_M) {
    return null;
  }
  const slopes = new Array(cols * rows).fill(NaN);
  let maxSlope = 0;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      if (!Number.isFinite(elevations[j * cols + i])) {
        continue;
      }
      const dzdx = gradient(elevations, cols, rows, i, j, 1, 0, cellSizeM);
      const dzdy = gradient(elevations, cols, rows, i, j, 0, 1, cellSizeM);
      const slope = Math.hypot(dzdx, dzdy);
      slopes[j * cols + i] = slope;
      if (slope > maxSlope) {
        maxSlope = slope;
      }
    }
  }
  return {
    originX: minX,
    originY: minY,
    cols,
    rows,
    cellSizeM,
    slopes,
    maxSlope,
    elevations,
    minElevation,
    maxElevation
  };
}
function normalizedElevationForRect(grid, rect) {
  const range = grid.maxElevation - grid.minElevation;
  if (!Number.isFinite(range) || range <= 1e-6) {
    return 0;
  }
  const i0 = Math.floor((rect.x - grid.originX) / grid.cellSizeM);
  const i1 = Math.floor((rect.x + rect.width - grid.originX) / grid.cellSizeM);
  const j0 = Math.floor((rect.y - grid.originY) / grid.cellSizeM);
  const j1 = Math.floor((rect.y + rect.height - grid.originY) / grid.cellSizeM);
  let sum2 = 0;
  let count = 0;
  for (let j = j0; j <= j1; j += 1) {
    for (let i = i0; i <= i1; i += 1) {
      if (i < 0 || i >= grid.cols || j < 0 || j >= grid.rows) {
        continue;
      }
      const elevation = grid.elevations[j * grid.cols + i];
      if (Number.isFinite(elevation)) {
        sum2 += elevation;
        count += 1;
      }
    }
  }
  return count > 0 ? (sum2 / count - grid.minElevation) / range : 0;
}
function difficultyForRect(grid, rect) {
  const i0 = Math.floor((rect.x - grid.originX) / grid.cellSizeM);
  const i1 = Math.floor((rect.x + rect.width - grid.originX) / grid.cellSizeM);
  const j0 = Math.floor((rect.y - grid.originY) / grid.cellSizeM);
  const j1 = Math.floor((rect.y + rect.height - grid.originY) / grid.cellSizeM);
  let sum2 = 0;
  let count = 0;
  for (let j = j0; j <= j1; j += 1) {
    for (let i = i0; i <= i1; i += 1) {
      if (i < 0 || i >= grid.cols || j < 0 || j >= grid.rows) {
        continue;
      }
      const slope = grid.slopes[j * grid.cols + i];
      if (Number.isFinite(slope)) {
        sum2 += slope;
        count += 1;
      }
    }
  }
  return count > 0 ? sum2 / count : 0;
}
function slopeAtPoint(grid, point) {
  const i = Math.floor((point.x - grid.originX) / grid.cellSizeM);
  const j = Math.floor((point.y - grid.originY) / grid.cellSizeM);
  if (i < 0 || i >= grid.cols || j < 0 || j >= grid.rows) {
    return 0;
  }
  const slope = grid.slopes[j * grid.cols + i];
  return Number.isFinite(slope) ? slope : 0;
}
function difficultyForPolygon(grid, polygon) {
  if (polygon.length < 3) {
    return 0;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of polygon) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const i0 = Math.floor((minX - grid.originX) / grid.cellSizeM);
  const i1 = Math.floor((maxX - grid.originX) / grid.cellSizeM);
  const j0 = Math.floor((minY - grid.originY) / grid.cellSizeM);
  const j1 = Math.floor((maxY - grid.originY) / grid.cellSizeM);
  let sum2 = 0;
  let count = 0;
  for (let j = j0; j <= j1; j += 1) {
    for (let i = i0; i <= i1; i += 1) {
      if (i < 0 || i >= grid.cols || j < 0 || j >= grid.rows) {
        continue;
      }
      const slope = grid.slopes[j * grid.cols + i];
      if (!Number.isFinite(slope)) {
        continue;
      }
      const center = {
        x: grid.originX + (i + 0.5) * grid.cellSizeM,
        y: grid.originY + (j + 0.5) * grid.cellSizeM
      };
      if (!isPointInPolygon2(center, polygon)) {
        continue;
      }
      sum2 += slope;
      count += 1;
    }
  }
  return count > 0 ? sum2 / count : 0;
}
function difficultyGridToGeoJson(grid, origin) {
  const features = [];
  for (let j = 0; j < grid.rows; j += 1) {
    for (let i = 0; i < grid.cols; i += 1) {
      const slope = grid.slopes[j * grid.cols + i];
      if (!Number.isFinite(slope)) {
        continue;
      }
      const normalized = Math.min(1, slope / SLOPE_REFERENCE);
      if (normalized < HEATMAP_MIN_NORMALIZED) {
        continue;
      }
      const x0 = grid.originX + i * grid.cellSizeM;
      const y0 = grid.originY + j * grid.cellSizeM;
      const x1 = x0 + grid.cellSizeM;
      const y1 = y0 + grid.cellSizeM;
      const ring = [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0]
      ].map(([x, y]) => {
        const lngLat = localMetersToLngLat(x, y, origin);
        return [lngLat.lng, lngLat.lat];
      });
      features.push({
        type: "Feature",
        properties: { difficulty: round3(normalized), slope: round3(slope) },
        geometry: { type: "Polygon", coordinates: [ring] }
      });
    }
  }
  return { type: "FeatureCollection", features };
}
function gradient(elevations, cols, rows, i, j, di, dj, spacingM) {
  const here = elevations[j * cols + i];
  const forward = sampleAt(elevations, cols, rows, i + di, j + dj);
  const backward = sampleAt(elevations, cols, rows, i - di, j - dj);
  if (Number.isFinite(forward) && Number.isFinite(backward)) {
    return (forward - backward) / (2 * spacingM);
  }
  if (Number.isFinite(forward)) {
    return (forward - here) / spacingM;
  }
  if (Number.isFinite(backward)) {
    return (here - backward) / spacingM;
  }
  return 0;
}
function sampleAt(elevations, cols, rows, i, j) {
  if (i < 0 || i >= cols || j < 0 || j >= rows) {
    return NaN;
  }
  return elevations[j * cols + i];
}
function isPointInPolygon2(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y && point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}
function round3(value) {
  return Math.round(value * 1e3) / 1e3;
}

// ../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/questionBank.ts
function scaleOptions(target, withOff = false) {
  const scale2 = [
    { label: "\uC801\uAC8C", effect: { target, enabled: true, weight: 0.5 } },
    { label: "\uBCF4\uD1B5", recommended: true, effect: { target, enabled: true, weight: 1 } },
    { label: "\uB9CE\uC774", effect: { target, enabled: true, weight: 1.5 } }
  ];
  return withOff ? [{ label: "\uD544\uC694\uC5C6\uC74C", effect: { target, enabled: false } }, ...scale2] : scale2;
}
var QUESTION_BANK = [
  {
    id: "guard-need",
    text: "\uACBD\uACC4\uCD08\uC18C\uAC00 \uD544\uC694\uD55C \uBD80\uB300\uC778\uAC00\uC694?",
    options: [
      { label: "\uD544\uC694\uC5C6\uC74C", effect: { target: "guard", enabled: false } },
      { label: "\uAE30\uBCF8 \uBC30\uCE58", recommended: true, effect: { target: "guard", enabled: true, weight: 1 } },
      { label: "\uAC15\uD654 \uBC30\uCE58", effect: { target: "guard", enabled: true, weight: 1.5 } }
    ]
  },
  { id: "training-scale", text: "\uAD50\uC721/\uD6C8\uB828 \uAD6C\uC5ED \uBE44\uC911\uC740 \uC5B4\uB290 \uC815\uB3C4\uB85C \uD560\uAE4C\uC694?", options: scaleOptions("training") },
  { id: "maintenance-scale", text: "\uC218\uC1A1/\uC815\uBE44 \uAD6C\uC5ED \uBE44\uC911\uC740 \uC5B4\uB290 \uC815\uB3C4\uB85C \uD560\uAE4C\uC694?", options: scaleOptions("maintenance") },
  { id: "supply-scale", text: "\uBCF4\uAE09/\uCC3D\uACE0 \uAD6C\uC5ED\uC740 \uC5B4\uB290 \uC815\uB3C4\uB85C \uD560\uAE4C\uC694?", options: scaleOptions("supply", true) },
  { id: "medical-scale", text: "\uC758\uBB34 \uC2DC\uC124\uC740 \uC5B4\uB290 \uC815\uB3C4\uB85C \uD560\uAE4C\uC694?", options: scaleOptions("medical", true) },
  { id: "parking-scale", text: "\uC8FC\uCC28 \uAD6C\uC5ED \uBE44\uC911\uC740 \uC5B4\uB290 \uC815\uB3C4\uB85C \uD560\uAE4C\uC694?", options: scaleOptions("parking") },
  { id: "living-scale", text: "\uC0DD\uD65C\uC2DC\uC124 \uBE44\uC911\uC740 \uC5B4\uB290 \uC815\uB3C4\uB85C \uD560\uAE4C\uC694?", options: scaleOptions("living") }
];
var QUESTION_IDS = QUESTION_BANK.map((question) => question.id);
function findQuestion(id) {
  return QUESTION_BANK.find((question) => question.id === id) ?? null;
}
function applyQuestionAnswer(requirements, questionId, optionIndex) {
  const question = findQuestion(questionId);
  const option = question?.options[optionIndex];
  if (!question || !option) {
    logScaffoldaError("SCAFFOLDA_AI_TURN_IGNORED_FIELD", {
      input: { field: "questionAnswer", questionId, optionIndex }
    });
    return requirements;
  }
  return applyModuleAdjustment(requirements, option.effect);
}

// ../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/ollamaClient.ts
var REQUIREMENTS_FORMAT = buildRequirementsResponseSchema(QUESTION_IDS);
var OLLAMA_CHAT_URL = "/ollama/api/chat";
var OLLAMA_MODEL = globalThis.__SCAFFOLDA_ENV__.VITE_OLLAMA_MODEL ?? "gemma4:e4b";
var AiPlacementError = class extends Error {
  constructor(code, userMessage, cause) {
    super(userMessage);
    __publicField(this, "code");
    __publicField(this, "userMessage");
    this.name = "AiPlacementError";
    this.code = code;
    this.userMessage = userMessage;
    if (cause instanceof Error) {
      this.stack = cause.stack;
    }
  }
};
async function requestDesignTurn(messages) {
  let response;
  try {
    response = await fetch(OLLAMA_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        think: false,
        format: REQUIREMENTS_FORMAT,
        options: { temperature: 0.4 }
      })
    });
  } catch (error) {
    logScaffoldaError("SCAFFOLDA_OLLAMA_UNREACHABLE", { input: { model: OLLAMA_MODEL }, error });
    throw new AiPlacementError(
      "SCAFFOLDA_OLLAMA_UNREACHABLE",
      `\uB85C\uCEEC AI \uC11C\uBC84\uC5D0 \uC5F0\uACB0\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. dev \uC11C\uBC84(npm run dev)\uC640 Ollama\uAC00 \uBAA8\uB450 \uC2E4\uD589 \uC911\uC778\uC9C0 \uD655\uC778\uD558\uC138\uC694(\uBAA8\uB378 ${OLLAMA_MODEL}).`,
      error
    );
  }
  if (!response.ok) {
    const upstreamText = await safeReadText(response);
    const proxyUnreachable = response.status === 502 || response.status === 503 || response.status === 504;
    const code = proxyUnreachable ? "SCAFFOLDA_OLLAMA_UNREACHABLE" : "SCAFFOLDA_OLLAMA_BAD_RESPONSE";
    logScaffoldaError(code, {
      input: { model: OLLAMA_MODEL, status: response.status },
      upstreamApiErrorMessage: upstreamText
    });
    throw new AiPlacementError(
      code,
      proxyUnreachable ? `\uB85C\uCEEC AI \uC11C\uBC84(Ollama)\uAC00 \uC751\uB2F5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4(HTTP ${response.status}). \uD130\uBBF8\uB110\uC5D0\uC11C \`ollama serve\`\uB85C \uC2E4\uD589\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.` : `AI \uC751\uB2F5 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4(HTTP ${response.status}). \uBAA8\uB378 ${OLLAMA_MODEL}\uC774(\uAC00) \uC124\uCE58\uB418\uC5B4 \uC788\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694.`
    );
  }
  const content = await extractMessageContent(response);
  return parseTurnContent(content);
}
async function extractMessageContent(response) {
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    logScaffoldaError("SCAFFOLDA_OLLAMA_BAD_RESPONSE", { error });
    throw new AiPlacementError("SCAFFOLDA_OLLAMA_BAD_RESPONSE", "AI \uC751\uB2F5\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.", error);
  }
  const content = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message?.content === "string" ? payload.message.content : "";
  if (!content) {
    logScaffoldaError("SCAFFOLDA_OLLAMA_BAD_RESPONSE", { output: payload });
    throw new AiPlacementError("SCAFFOLDA_OLLAMA_BAD_RESPONSE", "AI\uAC00 \uBE48 \uC751\uB2F5\uC744 \uBCF4\uB0C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.");
  }
  return content;
}
function parseTurnContent(content) {
  let raw;
  try {
    raw = JSON.parse(content);
  } catch (error) {
    logScaffoldaError("SCAFFOLDA_OLLAMA_BAD_RESPONSE", { input: content, error });
    throw new AiPlacementError("SCAFFOLDA_OLLAMA_BAD_RESPONSE", "AI \uC751\uB2F5 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.", error);
  }
  return resolveDesignTurn(raw, QUESTION_IDS);
}
async function safeReadText(response) {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return void 0;
  }
}
function createDesignSystemPrompt() {
  const templateList = Object.entries(UNIT_TEMPLATE_LABELS).map(([id, label]) => `${id}(${label})`).join(", ");
  const questionList = QUESTION_BANK.map((question) => `${question.id}: ${question.text}`).join(" / ");
  return {
    role: "system",
    content: [
      "\uB2F9\uC2E0\uC740 \uD55C\uAD6D\uAD70 \uBD80\uB300 \uBD80\uC9C0 \uC124\uACC4\uB97C \uB3D5\uB294 \uC870\uC218\uC785\uB2C8\uB2E4. \uC0AC\uC6A9\uC790\uC640 \uD55C\uAD6D\uC5B4\uB85C \uB300\uD654\uD569\uB2C8\uB2E4.",
      `\uC0AC\uC6A9\uC790\uC758 \uC124\uBA85\uC5D0\uC11C \uBD80\uB300\uC720\uD615(unitTemplate), \uCD1D\uC6D0, \uC0C1\uC8FC(\uC0DD\uD65C) \uC778\uC6D0\uC744 \uCD94\uCD9C\uD558\uC138\uC694. \uBD80\uB300\uC720\uD615: ${templateList}. \uC804\uCC28/\uAE30\uAC11\uC774\uBA74 armor, \uBCF8\uBD80\uBA74 headquarters, \uC815\uBE44 \uC704\uC8FC\uBA74 maintenance, \uBCF4\uBCD1\xB7\uB3D9\uC6D0\uC774\uBA74 infantry, \uC560\uB9E4\uD558\uBA74 generic.`,
      "\uC778\uC6D0\uC744 \uBAA8\uB974\uBA74 \uBD80\uB300\uC720\uD615\uC758 \uD1B5\uC0C1 \uADDC\uBAA8\uB85C \uCD94\uC815\uD574 requirements\uC5D0 \uB123\uACE0, reply\uC5D0 \uCD94\uC815\uC784\uC744 \uD55C \uBB38\uC7A5\uC73C\uB85C \uBC1D\uD788\uC138\uC694. \uC778\uC6D0\uC744 \uB418\uBB3B\uC9C0 \uB9D0\uACE0 \uC9C4\uD589\uD558\uC138\uC694.",
      "\uC774\uBBF8 \uC54C\uC544\uB0B8 \uAC12(\uC720\uD615\xB7\uC778\uC6D0)\uC740 \uB2E4\uC74C \uD134\uC5D0\uB3C4 \uADF8\uB300\uB85C \uC720\uC9C0\uD558\uC138\uC694. \uAC19\uC740 \uAC83\uC744 \uB450 \uBC88 \uBB3B\uC9C0 \uB9C8\uC138\uC694.",
      `\uBD80\uB300 \uD2B9\uC131(\uACBD\uACC4\uCD08\uC18C \uD544\uC694 \uC5EC\uBD80, \uD6C8\uB828\xB7\uC815\uBE44 \uBE44\uC911 \uB4F1)\uC744 \uD655\uC778\uD558\uACE0 \uC2F6\uC73C\uBA74 askQuestionIds\uC5D0 \uC544\uB798 \uC9C8\uBB38 id\uB97C \uCD5C\uB300 2\uAC1C \uB2F4\uC73C\uC138\uC694: ${questionList}.`,
      '\uC0AC\uC6A9\uC790\uAC00 \uC2DC\uC124\uC758 \uD544\uC694 \uC5EC\uBD80\uB098 \uBE44\uC911\uC744 \uC9C1\uC811 \uC5B8\uAE09\uD558\uBA74(\uC608: "\uD6C8\uB828\uC7A5 \uD06C\uAC8C", "\uC758\uBB34\uC2E4 \uD544\uC694\uC5C6\uC5B4") moduleAdjustments\uC5D0 \uB2F4\uC73C\uC138\uC694. target\uC740 guard|training|maintenance|supply|medical|parking|command|living, weight\uB294 0.5(\uC801\uAC8C)|1(\uBCF4\uD1B5)|1.5(\uB9CE\uC774).',
      "\uC88C\uD45C\uB098 \uAC74\uBB3C \uC704\uCE58\uB294 \uC808\uB300 \uB9CC\uB4E4\uC9C0 \uB9C8\uC138\uC694. \uADF8\uAC83\uC740 \uC2DC\uC2A4\uD15C\uC774 \uACC4\uC0B0\uD569\uB2C8\uB2E4.",
      "reply\uC5D0\uB294 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uB300\uD654\uBB38\uB9CC \uB2F4\uC73C\uC138\uC694."
    ].join("\n")
  };
}

// ../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/placementShapes.ts
var CANDIDATE_ANGLES_DEG = [0, 15, -15, 30, -30];
function rotatePolygon(points, deg, center) {
  if (deg === 0) {
    return points.map((point) => ({ ...point }));
  }
  const rad = deg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    };
  });
}
function scalePolygonToArea(points, targetAreaSqm) {
  const currentArea = calculateLocalPolygonAreaSquareMeters(points);
  if (currentArea <= 0 || targetAreaSqm <= 0) {
    return points.map((point) => ({ ...point }));
  }
  const scale2 = Math.sqrt(targetAreaSqm / currentArea);
  return points.map((point) => ({ x: point.x * scale2, y: point.y * scale2 }));
}
function footprintTemplates(targetAreaSqm) {
  return UNIT_TEMPLATES2.map((unit2) => scalePolygonToArea(unit2, targetAreaSqm));
}
var UNIT_TEMPLATES2 = [
  rectUnit(1.5),
  rectUnit(1),
  ...lUnits(),
  ...tUnits()
];
function rectUnit(aspect) {
  return [
    { x: 0, y: 0 },
    { x: aspect, y: 0 },
    { x: aspect, y: 1 },
    { x: 0, y: 1 }
  ];
}
function lUnits() {
  const n = 0.45;
  const base = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 - n },
    { x: 1 - n, y: 1 - n },
    { x: 1 - n, y: 1 },
    { x: 0, y: 1 }
  ];
  return [0, 90, 180, 270].map(
    (deg) => anchorToOrigin(rotatePolygon(base, deg, { x: 0.5, y: 0.5 }))
  );
}
function tUnits() {
  const sw = 0.3;
  const sh = 0.45;
  const base = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 - sh },
    { x: 1 - sw, y: 1 - sh },
    { x: 1 - sw, y: 1 },
    { x: sw, y: 1 },
    { x: sw, y: 1 - sh },
    { x: 0, y: 1 - sh }
  ];
  return [0, 180].map((deg) => anchorToOrigin(rotatePolygon(base, deg, { x: 0.5, y: 0.5 })));
}
function anchorToOrigin(points) {
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  return points.map((point) => ({ x: point.x - minX, y: point.y - minY }));
}

// ../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/externalRoads.ts
var ROAD_CLASS_RANK = {
  secondary: 0,
  secondary_link: 0,
  tertiary: 1,
  tertiary_link: 1,
  unclassified: 2,
  residential: 2,
  living_street: 2,
  road: 2,
  service: 3,
  track: 3,
  path: 4,
  footway: 4,
  cycleway: 4,
  pedestrian: 4
};
var EXTERNAL_ROAD_HIGHWAY_REGEX = `^(${Object.keys(ROAD_CLASS_RANK).join("|")})$`;
var OVERPASS_URL = "https://overpass-api.de/api/interpreter";
var FETCH_TIMEOUT_MS = 8e3;
var CROSSING_DEDUPE_M = 50;
var MAX_ENTRY_POINTS = 3;
async function getExternalRoadPoints(sitePlan) {
  const ring = boundaryRingLngLat(sitePlan.boundaryGeoJson);
  if (ring.length < 3) {
    return [];
  }
  const lines = await fetchExternalRoadLines(ring);
  return findBoundaryRoadCrossings(lines, ring, sitePlan.localOrigin);
}
async function fetchExternalRoadLines(ring) {
  const south = Math.min(...ring.map((point) => point.lat));
  const west = Math.min(...ring.map((point) => point.lng));
  const north = Math.max(...ring.map((point) => point.lat));
  const east = Math.max(...ring.map((point) => point.lng));
  const query = `[out:json][timeout:${Math.floor(FETCH_TIMEOUT_MS / 1e3)}];way[highway~"${EXTERNAL_ROAD_HIGHWAY_REGEX}"](${south},${west},${north},${east});out geom;`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: controller.signal
    });
    if (!response.ok) {
      logScaffoldaError("SCAFFOLDA_EXTERNAL_ROADS_FAILED", {
        input: { south, west, north, east },
        upstreamApiErrorMessage: `HTTP ${response.status}`
      });
      return [];
    }
    const payload = await response.json();
    return (payload.elements ?? []).filter(
      (element) => element.type === "way" && Array.isArray(element.geometry) && typeof element.tags?.highway === "string" && ROAD_CLASS_RANK[element.tags.highway] !== void 0
    ).map((element) => ({
      points: element.geometry.map((point) => ({ lng: point.lon, lat: point.lat })),
      rank: ROAD_CLASS_RANK[element.tags.highway]
    }));
  } catch (error) {
    logScaffoldaError("SCAFFOLDA_EXTERNAL_ROADS_FAILED", {
      input: { south, west, north, east },
      error
    });
    return [];
  } finally {
    clearTimeout(timer);
  }
}
function findBoundaryRoadCrossings(lines, ring, origin) {
  const boundary = ring.map((point) => lngLatToLocalMeters(point.lng, point.lat, origin));
  const crossings = [];
  for (const line of lines) {
    const localLine = line.points.map((point) => lngLatToLocalMeters(point.lng, point.lat, origin));
    for (let i = 0; i < localLine.length - 1; i += 1) {
      for (let j = 0; j < boundary.length; j += 1) {
        const hit = segmentIntersection(
          localLine[i],
          localLine[i + 1],
          boundary[j],
          boundary[(j + 1) % boundary.length]
        );
        if (hit) {
          crossings.push({ point: hit, rank: line.rank });
        }
      }
    }
  }
  if (crossings.length === 0) {
    return [];
  }
  const sortedByRank = [...crossings].sort((a, b) => a.rank - b.rank);
  const deduped = [];
  for (const crossing of sortedByRank) {
    if (deduped.every((existing) => distance2(existing, crossing.point) > CROSSING_DEDUPE_M)) {
      deduped.push(crossing.point);
    }
  }
  return deduped.length > MAX_ENTRY_POINTS ? selectSpreadEntryPoints(deduped, MAX_ENTRY_POINTS) : deduped;
}
function selectSpreadEntryPoints(points, max) {
  if (points.length <= max) {
    return points;
  }
  let bestI = 0;
  let bestJ = 1;
  let bestPairDistance = -Infinity;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const pairDistance = distance2(points[i], points[j]);
      if (pairDistance > bestPairDistance) {
        bestPairDistance = pairDistance;
        bestI = i;
        bestJ = j;
      }
    }
  }
  const selected = /* @__PURE__ */ new Set([bestI, bestJ]);
  while (selected.size < max) {
    let candidateIndex = -1;
    let candidateMinDistance = -Infinity;
    for (let k = 0; k < points.length; k += 1) {
      if (selected.has(k)) {
        continue;
      }
      let minDistanceToSelected = Infinity;
      for (const s of selected) {
        minDistanceToSelected = Math.min(minDistanceToSelected, distance2(points[k], points[s]));
      }
      if (minDistanceToSelected > candidateMinDistance) {
        candidateMinDistance = minDistanceToSelected;
        candidateIndex = k;
      }
    }
    selected.add(candidateIndex);
  }
  return Array.from(selected).sort((a, b) => a - b).map((index) => points[index]);
}
function boundaryRingLngLat(boundaryGeoJson) {
  const outer = boundaryGeoJson.coordinates[0] ?? [];
  const ring = outer.map(([lng, lat]) => ({ lng, lat }));
  if (ring.length > 1) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first.lng === last.lng && first.lat === last.lat) {
      ring.pop();
    }
  }
  return ring;
}
function segmentIntersection(a, b, p, q) {
  const d1x = b.x - a.x;
  const d1y = b.y - a.y;
  const d2x = q.x - p.x;
  const d2y = q.y - p.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) {
    return null;
  }
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const s = (wx * d2y - wy * d2x) / denom;
  const u4 = (wx * d1y - wy * d1x) / denom;
  if (s < 0 || s > 1 || u4 < 0 || u4 > 1) {
    return null;
  }
  return { x: a.x + d1x * s, y: a.y + d1y * s };
}
function distance2(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ../../Scaffolda-public/src/features/scaffolda/lib/createId.ts
function createId(prefix) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ../../Scaffolda-public/src/features/scaffolda/lib/siteZoneFactory.ts
function createSiteZone(tool, points, options = {}) {
  const roadShape = isRoadZone(tool);
  const shape = roadShape ? "road" : tool.shape;
  const floorContext = { kind: tool.kind, shape, facilityTypeId: tool.facilityTypeId };
  const floors = options.floors !== void 0 ? normalizeZoneFloors(options.floors, floorContext) : getDefaultZoneFloors(floorContext);
  return {
    id: options.id ?? createId("zone"),
    kind: tool.kind,
    shape,
    parentId: roadShape ? void 0 : options.parentId,
    category: tool.category,
    facilityTypeId: tool.facilityTypeId,
    label: tool.label,
    ...floors === void 0 ? {} : { floors },
    properties: roadShape ? void 0 : createDefaultZoneProperties(tool.defaultCapacity),
    points: cloneLocalPoints(points),
    road: roadShape ? createDefaultRoadProperties() : void 0,
    style: { ...tool.style }
  };
}
function cloneLocalPoints(points) {
  return points.map((point) => ({ x: point.x, y: point.y }));
}

// ../../Scaffolda-public/src/features/scaffolda/lib/siteZoneCatalog.ts
var FENCE_STROKE_COLOR = "#8b9097";
var FACILITY_ZONE_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#be185d",
  "#0f766e",
  "#9333ea",
  "#ea580c",
  "#0284c7",
  "#65a30d",
  "#b91c1c",
  "#4338ca",
  "#047857",
  "#a16207"
];
function createFacilityZoneTool(facilityType) {
  const fenceTool = isFenceZone({ facilityTypeId: facilityType.id, shape: void 0 });
  if (fenceTool || isRoadZone({ facilityTypeId: facilityType.id, shape: void 0 })) {
    return {
      id: `facility:${facilityType.id}`,
      kind: "facility",
      shape: "road",
      category: facilityType.category,
      facilityTypeId: facilityType.id,
      label: facilityType.name,
      defaultCapacity: facilityType.defaultCapacity,
      style: fenceTool ? createFenceStyle() : createRoadStyle()
    };
  }
  const fill = facilityType.color ?? getFacilityZoneColor(facilityType.id);
  return {
    id: `facility:${facilityType.id}`,
    kind: "facility",
    category: facilityType.category,
    facilityTypeId: facilityType.id,
    label: facilityType.name,
    defaultCapacity: facilityType.defaultCapacity,
    style: createZoneStyle(fill, 0.26, 2.2)
  };
}
function getFacilityZoneColor(facilityTypeId) {
  const hash = Array.from(facilityTypeId).reduce(
    (value, character) => value + character.charCodeAt(0),
    0
  );
  return FACILITY_ZONE_PALETTE[hash % FACILITY_ZONE_PALETTE.length];
}
function createZoneStyle(fill, fillOpacity, strokeWidth) {
  return {
    fill,
    fillOpacity,
    stroke: "#0f172a",
    strokeOpacity: 0.92,
    strokeWidth
  };
}
function createFenceStyle() {
  return {
    fill: "transparent",
    fillOpacity: 0,
    stroke: FENCE_STROKE_COLOR,
    strokeOpacity: 1,
    strokeWidth: 3
  };
}
function createRoadStyle() {
  return {
    fill: "transparent",
    fillOpacity: 0,
    stroke: "#000000",
    strokeOpacity: 1,
    strokeWidth: 5
  };
}

// ../../Scaffolda-public/src/features/scaffolda/lib/buildingClusters.ts
var import_martinez_polygon_clipping2 = __toESM(require_martinez_umd(), 1);
var SHARED_EDGE_TOLERANCE_METERS = 0.05;
var SHARED_EDGE_MIN_OVERLAP_METERS = 1;
function polygonsShareEdge(a, b, tolerance = SHARED_EDGE_TOLERANCE_METERS, minOverlap = SHARED_EDGE_MIN_OVERLAP_METERS) {
  for (let i = 0; i < a.length; i += 1) {
    const p1 = a[i];
    const p2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j += 1) {
      const q1 = b[j];
      const q2 = b[(j + 1) % b.length];
      if (edgesOverlapColinear(p1, p2, q1, q2, tolerance, minOverlap)) {
        return true;
      }
    }
  }
  return false;
}
function clusterBySharedEdge(items, polygonOf) {
  const parents = items.map((_, index) => index);
  const find = (index) => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]];
      index = parents[index];
    }
    return index;
  };
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (find(i) !== find(j) && polygonsShareEdge(polygonOf(items[i]), polygonOf(items[j]))) {
        parents[find(j)] = find(i);
      }
    }
  }
  const groups = /* @__PURE__ */ new Map();
  items.forEach((item, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(item);
    groups.set(root, group);
  });
  return [...groups.values()];
}
function edgesOverlapColinear(p1, p2, q1, q2, tolerance, minOverlap) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-9) {
    return false;
  }
  const ux = dx / length;
  const uy = dy / length;
  if (Math.abs(crossToLine(p1, ux, uy, q1)) > tolerance || Math.abs(crossToLine(p1, ux, uy, q2)) > tolerance) {
    return false;
  }
  const t1 = 0;
  const t2 = length;
  const s1 = (q1.x - p1.x) * ux + (q1.y - p1.y) * uy;
  const s2 = (q2.x - p1.x) * ux + (q2.y - p1.y) * uy;
  const overlap = Math.min(Math.max(t1, t2), Math.max(s1, s2)) - Math.max(Math.min(t1, t2), Math.min(s1, s2));
  return overlap >= minOverlap;
}
function crossToLine(origin, ux, uy, point) {
  return (point.x - origin.x) * uy - (point.y - origin.y) * ux;
}

// ../../Scaffolda-public/src/features/scaffolda/lib/siteWalkway.ts
var import_martinez_polygon_clipping3 = __toESM(require_martinez_umd(), 1);
var WALKWAY_WIDTH_METERS = 4;

// node_modules/robust-predicates/esm/util.js
var epsilon = 11102230246251565e-32;
var splitter = 134217729;
var resulterrbound = (3 + 8 * epsilon) * epsilon;
function sum(elen, e, flen, f, h) {
  let Q, Qnew, hh, bvirt;
  let enow = e[0];
  let fnow = f[0];
  let eindex = 0;
  let findex = 0;
  if (fnow > enow === fnow > -enow) {
    Q = enow;
    enow = e[++eindex];
  } else {
    Q = fnow;
    fnow = f[++findex];
  }
  let hindex = 0;
  if (eindex < elen && findex < flen) {
    if (fnow > enow === fnow > -enow) {
      Qnew = enow + Q;
      hh = Q - (Qnew - enow);
      enow = e[++eindex];
    } else {
      Qnew = fnow + Q;
      hh = Q - (Qnew - fnow);
      fnow = f[++findex];
    }
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
    while (eindex < elen && findex < flen) {
      if (fnow > enow === fnow > -enow) {
        Qnew = Q + enow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (enow - bvirt);
        enow = e[++eindex];
      } else {
        Qnew = Q + fnow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (fnow - bvirt);
        fnow = f[++findex];
      }
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
    }
  }
  while (eindex < elen) {
    Qnew = Q + enow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (enow - bvirt);
    enow = e[++eindex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  while (findex < flen) {
    Qnew = Q + fnow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (fnow - bvirt);
    fnow = f[++findex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  if (Q !== 0 || hindex === 0) {
    h[hindex++] = Q;
  }
  return hindex;
}
function estimate(elen, e) {
  let Q = e[0];
  for (let i = 1; i < elen; i++) Q += e[i];
  return Q;
}
function vec(n) {
  return new Float64Array(n);
}

// node_modules/robust-predicates/esm/orient2d.js
var ccwerrboundA = (3 + 16 * epsilon) * epsilon;
var ccwerrboundB = (2 + 12 * epsilon) * epsilon;
var ccwerrboundC = (9 + 64 * epsilon) * epsilon * epsilon;
var B = vec(4);
var C1 = vec(8);
var C2 = vec(12);
var D = vec(16);
var u = vec(4);
function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
  let acxtail, acytail, bcxtail, bcytail;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
  const acx = ax - cx;
  const bcx = bx - cx;
  const acy = ay - cy;
  const bcy = by - cy;
  s1 = acx * bcy;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcx;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  B[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  B[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  B[2] = _j - (u32 - bvirt) + (_i - bvirt);
  B[3] = u32;
  let det = estimate(4, B);
  let errbound = ccwerrboundB * detsum;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - acx;
  acxtail = ax - (acx + bvirt) + (bvirt - cx);
  bvirt = bx - bcx;
  bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
  bvirt = ay - acy;
  acytail = ay - (acy + bvirt) + (bvirt - cy);
  bvirt = by - bcy;
  bcytail = by - (bcy + bvirt) + (bvirt - cy);
  if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
    return det;
  }
  errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det);
  det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
  if (det >= errbound || -det >= errbound) return det;
  s1 = acxtail * bcy;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcx;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C1len = sum(4, B, 4, u, C1);
  s1 = acx * bcytail;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcxtail;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C2len = sum(C1len, C1, 4, u, C2);
  s1 = acxtail * bcytail;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcxtail;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const Dlen = sum(C2len, C2, 4, u, D);
  return D[Dlen - 1];
}
function orient2d(ax, ay, bx, by, cx, cy) {
  const detleft = (ay - cy) * (bx - cx);
  const detright = (ax - cx) * (by - cy);
  const det = detleft - detright;
  const detsum = Math.abs(detleft + detright);
  if (Math.abs(det) >= ccwerrboundA * detsum) return det;
  return -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
}

// node_modules/robust-predicates/esm/orient3d.js
var o3derrboundA = (7 + 56 * epsilon) * epsilon;
var o3derrboundB = (3 + 28 * epsilon) * epsilon;
var o3derrboundC = (26 + 288 * epsilon) * epsilon * epsilon;
var bc = vec(4);
var ca = vec(4);
var ab = vec(4);
var at_b = vec(4);
var at_c = vec(4);
var bt_c = vec(4);
var bt_a = vec(4);
var ct_a = vec(4);
var ct_b = vec(4);
var bct = vec(8);
var cat = vec(8);
var abt = vec(8);
var u2 = vec(4);
var _8 = vec(8);
var _8b = vec(8);
var _16 = vec(16);
var _12 = vec(12);
var fin = vec(192);
var fin2 = vec(192);

// node_modules/robust-predicates/esm/incircle.js
var iccerrboundA = (10 + 96 * epsilon) * epsilon;
var iccerrboundB = (4 + 48 * epsilon) * epsilon;
var iccerrboundC = (44 + 576 * epsilon) * epsilon * epsilon;
var bc2 = vec(4);
var ca2 = vec(4);
var ab2 = vec(4);
var aa = vec(4);
var bb = vec(4);
var cc = vec(4);
var u3 = vec(4);
var v = vec(4);
var axtbc = vec(8);
var aytbc = vec(8);
var bxtca = vec(8);
var bytca = vec(8);
var cxtab = vec(8);
var cytab = vec(8);
var abt2 = vec(8);
var bct2 = vec(8);
var cat2 = vec(8);
var abtt = vec(4);
var bctt = vec(4);
var catt = vec(4);
var _82 = vec(8);
var _162 = vec(16);
var _16b = vec(16);
var _16c = vec(16);
var _32 = vec(32);
var _32b = vec(32);
var _48 = vec(48);
var _64 = vec(64);
var fin3 = vec(1152);
var fin22 = vec(1152);

// node_modules/robust-predicates/esm/insphere.js
var isperrboundA = (16 + 224 * epsilon) * epsilon;
var isperrboundB = (5 + 72 * epsilon) * epsilon;
var isperrboundC = (71 + 1408 * epsilon) * epsilon * epsilon;
var ab3 = vec(4);
var bc3 = vec(4);
var cd = vec(4);
var de = vec(4);
var ea = vec(4);
var ac = vec(4);
var bd = vec(4);
var ce = vec(4);
var da = vec(4);
var eb = vec(4);
var abc = vec(24);
var bcd = vec(24);
var cde = vec(24);
var dea = vec(24);
var eab = vec(24);
var abd = vec(24);
var bce = vec(24);
var cda = vec(24);
var deb = vec(24);
var eac = vec(24);
var adet = vec(1152);
var bdet = vec(1152);
var cdet = vec(1152);
var ddet = vec(1152);
var edet = vec(1152);
var abdet = vec(2304);
var cddet = vec(2304);
var cdedet = vec(3456);
var deter = vec(5760);
var _83 = vec(8);
var _8b2 = vec(8);
var _8c = vec(8);
var _163 = vec(16);
var _24 = vec(24);
var _482 = vec(48);
var _48b = vec(48);
var _96 = vec(96);
var _192 = vec(192);
var _384x = vec(384);
var _384y = vec(384);
var _384z = vec(384);
var _768 = vec(768);
var xdet = vec(96);
var ydet = vec(96);
var zdet = vec(96);
var fin4 = vec(1152);

// node_modules/delaunator/index.js
var EPSILON = Math.pow(2, -52);
var EDGE_STACK = new Uint32Array(512);
var Delaunator = class _Delaunator {
  /**
   * Constructs a delaunay triangulation object given an array of points (`[x, y]` by default).
   * `getX` and `getY` are optional functions of the form `(point) => value` for custom point formats.
   *
   * @template P
   * @param {P[]} points
   * @param {(p: P) => number} [getX]
   * @param {(p: P) => number} [getY]
   */
  // @ts-expect-error TS2322
  static from(points, getX = defaultGetX, getY = defaultGetY) {
    const n = points.length;
    const coords = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      const p = points[i];
      coords[2 * i] = getX(p);
      coords[2 * i + 1] = getY(p);
    }
    return new _Delaunator(coords);
  }
  /**
   * Constructs a delaunay triangulation object given an array of point coordinates of the form:
   * `[x0, y0, x1, y1, ...]` (use a typed array for best performance). Duplicate points are skipped.
   *
   * @param {T} coords
   */
  constructor(coords) {
    const n = coords.length >> 1;
    if (n > 0 && typeof coords[0] !== "number") throw new Error("Expected coords to contain numbers.");
    this.coords = coords;
    const maxTriangles = Math.max(2 * n - 5, 0);
    this._triangles = new Uint32Array(maxTriangles * 3);
    this._halfedges = new Int32Array(maxTriangles * 3);
    this._hashSize = Math.ceil(Math.sqrt(n));
    this._hullPrev = new Uint32Array(n);
    this._hullNext = new Uint32Array(n);
    this._hullTri = new Uint32Array(n);
    this._hullHash = new Int32Array(this._hashSize);
    this._ids = new Uint32Array(n);
    this._dists = new Float64Array(n);
    this.trianglesLen = 0;
    this._cx = 0;
    this._cy = 0;
    this._hullStart = 0;
    this.hull = this._triangles;
    this.triangles = this._triangles;
    this.halfedges = this._halfedges;
    this.update();
  }
  /**
   * Updates the triangulation if you modified `delaunay.coords` values in place, avoiding expensive memory allocations.
   * Useful for iterative relaxation algorithms such as Lloyd's.
   */
  update() {
    const { coords, _hullPrev: hullPrev, _hullNext: hullNext, _hullTri: hullTri, _hullHash: hullHash } = this;
    const n = coords.length >> 1;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      this._ids[i] = i;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let i0 = 0, i1 = 0, i2 = 0;
    for (let i = 0, minDist = Infinity; i < n; i++) {
      const d = dist(cx, cy, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist) {
        i0 = i;
        minDist = d;
      }
    }
    const i0x = coords[2 * i0];
    const i0y = coords[2 * i0 + 1];
    for (let i = 0, minDist = Infinity; i < n; i++) {
      if (i === i0) continue;
      const d = dist(i0x, i0y, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist && d > 0) {
        i1 = i;
        minDist = d;
      }
    }
    let i1x = coords[2 * i1];
    let i1y = coords[2 * i1 + 1];
    let minRadius = Infinity;
    for (let i = 0; i < n; i++) {
      if (i === i0 || i === i1) continue;
      const r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i], coords[2 * i + 1]);
      if (r < minRadius) {
        i2 = i;
        minRadius = r;
      }
    }
    let i2x = coords[2 * i2];
    let i2y = coords[2 * i2 + 1];
    if (minRadius === Infinity) {
      for (let i = 0; i < n; i++) {
        this._dists[i] = coords[2 * i] - coords[0] || coords[2 * i + 1] - coords[1];
      }
      quicksort(this._ids, this._dists, 0, n - 1);
      const hull = new Uint32Array(n);
      let j = 0;
      for (let i = 0, d0 = -Infinity; i < n; i++) {
        const id = this._ids[i];
        const d = this._dists[id];
        if (d > d0) {
          hull[j++] = id;
          d0 = d;
        }
      }
      this.hull = hull.subarray(0, j);
      this.triangles = new Uint32Array(0);
      this.halfedges = new Int32Array(0);
      return;
    }
    if (orient2d(i0x, i0y, i1x, i1y, i2x, i2y) < 0) {
      const i = i1;
      const x = i1x;
      const y = i1y;
      i1 = i2;
      i1x = i2x;
      i1y = i2y;
      i2 = i;
      i2x = x;
      i2y = y;
    }
    const center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
    this._cx = center.x;
    this._cy = center.y;
    for (let i = 0; i < n; i++) {
      this._dists[i] = dist(coords[2 * i], coords[2 * i + 1], center.x, center.y);
    }
    quicksort(this._ids, this._dists, 0, n - 1);
    this._hullStart = i0;
    let hullSize = 3;
    hullNext[i0] = hullPrev[i2] = i1;
    hullNext[i1] = hullPrev[i0] = i2;
    hullNext[i2] = hullPrev[i1] = i0;
    hullTri[i0] = 0;
    hullTri[i1] = 1;
    hullTri[i2] = 2;
    hullHash.fill(-1);
    hullHash[this._hashKey(i0x, i0y)] = i0;
    hullHash[this._hashKey(i1x, i1y)] = i1;
    hullHash[this._hashKey(i2x, i2y)] = i2;
    this.trianglesLen = 0;
    this._addTriangle(i0, i1, i2, -1, -1, -1);
    for (let k = 0, xp = 0, yp = 0; k < this._ids.length; k++) {
      const i = this._ids[k];
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (k > 0 && Math.abs(x - xp) <= EPSILON && Math.abs(y - yp) <= EPSILON) continue;
      xp = x;
      yp = y;
      if (i === i0 || i === i1 || i === i2) continue;
      let start = 0;
      for (let j = 0, key = this._hashKey(x, y); j < this._hashSize; j++) {
        start = hullHash[(key + j) % this._hashSize];
        if (start !== -1 && start !== hullNext[start]) break;
      }
      start = hullPrev[start];
      let e = start, q;
      while (q = hullNext[e], orient2d(x, y, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1]) >= 0) {
        e = q;
        if (e === start) {
          e = -1;
          break;
        }
      }
      if (e === -1) continue;
      let t = this._addTriangle(e, i, hullNext[e], -1, -1, hullTri[e]);
      hullTri[i] = this._legalize(t + 2);
      hullTri[e] = t;
      hullSize++;
      let n2 = hullNext[e];
      while (q = hullNext[n2], orient2d(x, y, coords[2 * n2], coords[2 * n2 + 1], coords[2 * q], coords[2 * q + 1]) < 0) {
        t = this._addTriangle(n2, i, q, hullTri[i], -1, hullTri[n2]);
        hullTri[i] = this._legalize(t + 2);
        hullNext[n2] = n2;
        hullSize--;
        n2 = q;
      }
      if (e === start) {
        while (q = hullPrev[e], orient2d(x, y, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1]) < 0) {
          t = this._addTriangle(q, i, e, -1, hullTri[e], hullTri[q]);
          this._legalize(t + 2);
          hullTri[q] = t;
          hullNext[e] = e;
          hullSize--;
          e = q;
        }
      }
      this._hullStart = hullPrev[i] = e;
      hullNext[e] = hullPrev[n2] = i;
      hullNext[i] = n2;
      hullHash[this._hashKey(x, y)] = i;
      hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
    }
    this.hull = new Uint32Array(hullSize);
    for (let i = 0, e = this._hullStart; i < hullSize; i++) {
      this.hull[i] = e;
      e = hullNext[e];
    }
    this.triangles = this._triangles.subarray(0, this.trianglesLen);
    this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
  }
  /**
   * Calculate an angle-based key for the edge hash used for advancing convex hull.
   *
   * @param {number} x
   * @param {number} y
   * @private
   */
  _hashKey(x, y) {
    return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
  }
  /**
   * Flip an edge in a pair of triangles if it doesn't satisfy the Delaunay condition.
   *
   * @param {number} a
   * @private
   */
  _legalize(a) {
    const { _triangles: triangles, _halfedges: halfedges, coords } = this;
    let i = 0;
    let ar = 0;
    while (true) {
      const b = halfedges[a];
      const a0 = a - a % 3;
      ar = a0 + (a + 2) % 3;
      if (b === -1) {
        if (i === 0) break;
        a = EDGE_STACK[--i];
        continue;
      }
      const b0 = b - b % 3;
      const al = a0 + (a + 1) % 3;
      const bl = b0 + (b + 2) % 3;
      const p0 = triangles[ar];
      const pr = triangles[a];
      const pl = triangles[al];
      const p1 = triangles[bl];
      const illegal = inCircle(
        coords[2 * p0],
        coords[2 * p0 + 1],
        coords[2 * pr],
        coords[2 * pr + 1],
        coords[2 * pl],
        coords[2 * pl + 1],
        coords[2 * p1],
        coords[2 * p1 + 1]
      );
      if (illegal) {
        triangles[a] = p1;
        triangles[b] = p0;
        const hbl = halfedges[bl];
        if (hbl === -1) {
          let e = this._hullStart;
          do {
            if (this._hullTri[e] === bl) {
              this._hullTri[e] = a;
              break;
            }
            e = this._hullPrev[e];
          } while (e !== this._hullStart);
        }
        this._link(a, hbl);
        this._link(b, halfedges[ar]);
        this._link(ar, bl);
        const br = b0 + (b + 1) % 3;
        if (i < EDGE_STACK.length) {
          EDGE_STACK[i++] = br;
        }
      } else {
        if (i === 0) break;
        a = EDGE_STACK[--i];
      }
    }
    return ar;
  }
  /**
   * Link two half-edges to each other.
   * @param {number} a
   * @param {number} b
   * @private
   */
  _link(a, b) {
    this._halfedges[a] = b;
    if (b !== -1) this._halfedges[b] = a;
  }
  /**
   * Add a new triangle given vertex indices and adjacent half-edge ids.
   *
   * @param {number} i0
   * @param {number} i1
   * @param {number} i2
   * @param {number} a
   * @param {number} b
   * @param {number} c
   * @private
   */
  _addTriangle(i0, i1, i2, a, b, c) {
    const t = this.trianglesLen;
    this._triangles[t] = i0;
    this._triangles[t + 1] = i1;
    this._triangles[t + 2] = i2;
    this._link(t, a);
    this._link(t + 1, b);
    this._link(t + 2, c);
    this.trianglesLen += 3;
    return t;
  }
};
function pseudoAngle(dx, dy) {
  const p = dx / (Math.abs(dx) + Math.abs(dy));
  return (dy > 0 ? 3 - p : 1 + p) / 4;
}
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
function inCircle(ax, ay, bx, by, cx, cy, px, py) {
  const dx = ax - px;
  const dy = ay - py;
  const ex = bx - px;
  const ey = by - py;
  const fx = cx - px;
  const fy = cy - py;
  const ap = dx * dx + dy * dy;
  const bp = ex * ex + ey * ey;
  const cp = fx * fx + fy * fy;
  return dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0;
}
function circumradius(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = (ey * bl - dy * cl) * d;
  const y = (dx * cl - ex * bl) * d;
  return x * x + y * y;
}
function circumcenter(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = ax + (ey * bl - dy * cl) * d;
  const y = ay + (dx * cl - ex * bl) * d;
  return { x, y };
}
function quicksort(ids, dists, left, right) {
  if (right - left <= 20) {
    for (let i = left + 1; i <= right; i++) {
      const temp = ids[i];
      const tempDist = dists[temp];
      let j = i - 1;
      while (j >= left && dists[ids[j]] > tempDist) ids[j + 1] = ids[j--];
      ids[j + 1] = temp;
    }
  } else {
    const median = left + right >> 1;
    let i = left + 1;
    let j = right;
    swap(ids, median, i);
    if (dists[ids[left]] > dists[ids[right]]) swap(ids, left, right);
    if (dists[ids[i]] > dists[ids[right]]) swap(ids, i, right);
    if (dists[ids[left]] > dists[ids[i]]) swap(ids, left, i);
    const temp = ids[i];
    const tempDist = dists[temp];
    while (true) {
      do
        i++;
      while (dists[ids[i]] < tempDist);
      do
        j--;
      while (dists[ids[j]] > tempDist);
      if (j < i) break;
      swap(ids, i, j);
    }
    ids[left + 1] = ids[j];
    ids[j] = temp;
    if (right - i + 1 >= j - left) {
      quicksort(ids, dists, i, right);
      quicksort(ids, dists, left, j - 1);
    } else {
      quicksort(ids, dists, left, j - 1);
      quicksort(ids, dists, i, right);
    }
  }
}
function swap(arr, i, j) {
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}
function defaultGetX(p) {
  return p[0];
}
function defaultGetY(p) {
  return p[1];
}

// ../../Scaffolda-public/src/features/scaffolda/lib/aiPlacement/placementEngine.ts
var ASPECT_RATIO = 1.5;
var MARGIN_METERS = 6;
var ROW_GAP_METERS = 8;
var COL_GAP_METERS = 5;
var FACILITY_INSET_METERS = 3;
var MIN_CATEGORY_SIDE_METERS = 4;
var SCAN_STEPS_PER_AXIS = 48;
var ROAD_MIN_LENGTH_METERS = 2;
var AUTO_ROAD_HALF_WIDTH_M = 4;
var ROAD_HUB_PERSONNEL_RATIO = 0.4;
var ROAD_ROUTE_CLEARANCE_M = 0.5;
var ROAD_ROUTE_CELL_M = 4;
var ROAD_ROUTE_MAX_NODES = 25e4;
var DIFFICULTY_BAND_RANK = { low: 0, moderate: 1, high: 2, severe: 3 };
var TIE_EPSILON = 1e-6;
var TERRAIN_WEIGHT = 4;
var SLOPE_REFERENCE2 = 0.3;
var ELEVATION_WEIGHT = 3;
var SAME_GROUP_DISTANCE_M = 40;
var SAME_CATEGORY_DISTANCE_M = 80;
var AFFINITY_DISTANCE_M = 100;
var NEIGHBOR_DISTANCE_M = 60;
var CAMP_AREA_PACK_FACTOR = 3;
var ENTRY_ANCHOR_DISTANCE_M = 30;
var FLUSH_SCORE_TOLERANCE = 0.75;
var UNPLACED_PENALTY = 10;
var ENTRY_CLEAR_RADIUS_M = 150;
var ENTRY_CLEAR_PENALTY = 1e3;
var ENTRY_ROAD_LANES = 2;
var ENTRY_ROAD_HALF_WIDTH_M = 8;
var ROAD_SLOPE_COST_K = 8;
var ROAD_SLOPE_STRAIGHT_MAX = 0.12;
var ROAD_SLOPE_SHORTCUT_TOLERANCE = 0.02;
var CARE_AFFINITY_CATEGORIES = /* @__PURE__ */ new Set([
  "command",
  "living",
  "training",
  "vehicle"
]);
var PARKING_EXCLUDED_CATEGORIES = /* @__PURE__ */ new Set([
  "training",
  "entry",
  "infrastructure",
  "other"
]);
var PARKING_FACILITY_TYPE_IDS = /* @__PURE__ */ new Set(["parking-zone", "vehicle-parking-zone"]);
var PARKING_RATIO = 0.2;
var PARKING_AREA_PER_STALL_M2 = 32;
var PARKING_DEPTH_M = 11.2;
var PARKING_DEPTH_PERIOD_M = 16.4;
var MAINTENANCE_PARKING_RATIO = 0.3;
var MILITARY_PARKING_DEPTH_M = 20.4;
var MILITARY_PARKING_DEPTH_PERIOD_M = 15.2;
var MILITARY_PARKING_AREA_PER_STALL_M2 = 27;
var PARKING_MAX_MODULES = 6;
var PARKING_WALKWAY_GAP_M = WALKWAY_WIDTH_METERS;
var PARKING_NEARBY_RADIUS_M = 60;
var INFRA_COVER_RADIUS_M = 700;
var INFRA_MAX_UNITS = 4;
var INFRA_ADJACENCY_SCALE_M = 25;
var GUARD_COVER_SPACING_M = 700;
var GUARD_SPACING_BY_WEIGHT = { 0.5: 1e3, 1: 700, 1.5: 500 };
var GUARD_INSET_M = 12;
var GUARD_SIDE_M = 7;
var WELFARE_DEDUP_RADIUS_M = 300;
function generatePlacement(boundary, requirements, difficultyGrid = null, sampleGround = null, options = {}) {
  const bounds = getBounds(boundary);
  if (!bounds) {
    return {
      zones: [],
      summary: emptySummary(Boolean(difficultyGrid)),
      warnings: ["\uACBD\uACC4 \uD3F4\uB9AC\uACE4\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544 \uBC30\uCE58\uB97C \uB9CC\uB4E4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."],
      notes: []
    };
  }
  const usableWidth = Math.max(0, bounds.maxX - bounds.minX - MARGIN_METERS * 2);
  const usableHeight = Math.max(0, bounds.maxY - bounds.minY - MARGIN_METERS * 2);
  const existingZones = options.existingZones ?? [];
  const preExisting = extractExistingPlacement(existingZones);
  const anchors = resolveEntryAnchors(boundary, options.externalRoadPoints);
  const activeAnchors = removeOccupiedAnchors(anchors, preExisting.entryCenters);
  const siteBox = {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY
  };
  const blockedPolygons = (options.existingBuildings ?? []).filter(
    (polygon) => rectsOverlapWithGap(boundingRect(polygon), siteBox, 0)
  );
  const blockedBoxes = blockedPolygons.map((polygon) => boundingRect(polygon));
  const scan = {
    boundary,
    usableX: bounds.minX + MARGIN_METERS,
    usableY: bounds.minY + MARGIN_METERS,
    usableWidth,
    usableHeight,
    // 경계가 축에 정렬되지 않아도 동작하도록 폴리곤 안쪽을 격자로 탐색한다.
    stepX: Math.max(COL_GAP_METERS, usableWidth / SCAN_STEPS_PER_AXIS),
    stepY: Math.max(ROW_GAP_METERS, usableHeight / SCAN_STEPS_PER_AXIS),
    // 옵션 미지정(false)이면 기존 경로와 완전히 동일하게 동작한다(회귀 0).
    maximizeSiteUsage: options.maximizeSiteUsage ?? false,
    // 건물 배치 기준점은 부지 안쪽 중심이다 — anchor는 전부 경계 위 점이라 그 중심을 쓰면 무리가 경계에 붙는다.
    siteCore: siteCoreOf(boundary),
    blockedBoxes,
    blockedPolygons
  };
  const program = buildProgram(requirements, anchors.length);
  const units = deductExistingUnits(program.units, preExisting.deductCounts);
  const totalFootprint = units.reduce((sum2, u4) => sum2 + u4.floorAreaM2 / Math.max(1, u4.fixedFloors ?? 2), 0);
  const neededRadius = Math.sqrt(CAMP_AREA_PACK_FACTOR * totalFootprint / Math.PI);
  const preReach = preExisting.units.filter((p) => p.unit.category !== "entry").reduce((max, p) => Math.max(max, distance3(scan.siteCore, p.center)), 0);
  const coreRadius = Math.max(...boundary.map((v2) => distance3(scan.siteCore, v2)));
  scan.pullFreeRadiusM = Math.min(Math.max(neededRadius, preReach), coreRadius);
  const orderings = buildOrderings(units);
  let best = null;
  for (const unitsOrder of orderings) {
    const run2 = runPlacement(unitsOrder, scan, difficultyGrid, sampleGround, activeAnchors, preExisting.units);
    if (!best || run2.totalScore < best.totalScore - TIE_EPSILON) {
      best = run2;
    }
  }
  const run = best;
  const allPlaced = [...preExisting.units, ...run.placedUnits];
  const zones = [];
  const warnings = [...run.warnings];
  for (const placed of run.placedUnits) {
    zones.push(...createUnitZones(placed));
  }
  const parkingModule = requirements.modules.parking;
  const parking = parkingModule.enabled ? placeParkingZones(allPlaced, scan, parkingModule.weight) : { zones: [], boxes: [], warnings: [] };
  zones.push(...parking.zones);
  warnings.push(...parking.warnings);
  const guardModule = requirements.modules.guard;
  const guardSpacingM = GUARD_SPACING_BY_WEIGHT[guardModule.weight];
  const guards = guardModule.enabled && !preExisting.hasGuard ? placeGuardPosts(boundary, allPlaced, parking.boxes.map((box) => box.rect), guardSpacingM, blockedBoxes) : { zones: [], warnings: [], count: 0, placedCount: 0 };
  zones.push(...guards.zones);
  warnings.push(...guards.warnings);
  const connectorRoads = createConnectorRoads(allPlaced, parking.boxes, boundary, difficultyGrid, blockedPolygons);
  const entryRoads = createEntryAccessRoads(allPlaced, parking.boxes, boundary, difficultyGrid, blockedPolygons);
  const roadZones = [...connectorRoads.roads, ...entryRoads.roads];
  zones.push(...roadZones);
  const notes = [...program.notes];
  if ((options.externalRoadPoints ?? []).length === 0) {
    notes.push(
      "\uC678\uBD80 \uB3C4\uB85C \uC811\uC810\uC744 \uCC3E\uC9C0 \uBABB\uD574 \uAC00\uC7A5 \uAE34 \uACBD\uACC4 \uBCC0\uC5D0 \uCD9C\uC785 \uAD6C\uC5ED 1\uAC1C\uB97C \uAE30\uBCF8 \uBC30\uCE58\uD588\uC2B5\uB2C8\uB2E4. \uC7AC\uC0DD\uC131\uD558\uBA74 \uB3C4\uB85C \uC870\uD68C\uB97C \uB2E4\uC2DC \uC2DC\uB3C4\uD569\uB2C8\uB2E4."
    );
  }
  if (blockedBoxes.length > 0) {
    notes.push(`\uAE30\uC874 \uAC74\uBB3C ${blockedBoxes.length}\uB3D9\uC744 \uD53C\uD574 \uBC30\uCE58\uD588\uC2B5\uB2C8\uB2E4.`);
  }
  if (connectorRoads.blockedCount + entryRoads.blockedCount > 0) {
    notes.push("\uC77C\uBD80 \uC790\uB3D9 \uB3C4\uB85C\uAC00 \uC7A5\uC560\uBB3C\uC744 \uC644\uC804\uD788 \uC6B0\uD68C\uD558\uC9C0 \uBABB\uD574 \uC9C1\uC120\uC73C\uB85C \uC720\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
  }
  if (existingZones.length > 0) {
    const deductedCount = program.units.length - units.length;
    notes.push(`\uAE30\uC874 \uC601\uC5ED ${preExisting.units.length}\uAC1C\uB97C \uC720\uC9C0\uD558\uACE0 \uC2DC\uC124 ${deductedCount}\uAC1C\uB97C \uC694\uAD6C\uB7C9\uC5D0\uC11C \uCC28\uAC10\uD588\uC2B5\uB2C8\uB2E4.`);
  }
  if (zones.length === 0) {
    if (units.length === 0 && existingZones.length > 0) {
      notes.push("\uAE30\uC874 \uBC30\uCE58\uAC00 \uC694\uAD6C\uB7C9\uC744 \uBAA8\uB450 \uCDA9\uC871\uD558\uC5EC \uCD94\uAC00\uB85C \uBC30\uCE58\uD560 \uC2DC\uC124\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    } else {
      warnings.push("\uACBD\uACC4\uAC00 \uC881\uC544 \uC5B4\uB5A4 \uC601\uC5ED\uB3C4 \uBC30\uCE58\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB354 \uB113\uC740 \uC601\uC5ED\uC744 \uC120\uD0DD\uD558\uC138\uC694.");
    }
  }
  const rules = buildRules(requirements, units, { ...run, placedUnits: allPlaced }, {
    enabled: guardModule.enabled,
    spacingM: guardSpacingM,
    count: guards.count,
    placedCount: guards.placedCount
  });
  return {
    zones,
    summary: {
      categories: buildCategorySummaries(units, run.placedUnits),
      units: run.unitSummaries,
      placedCount: run.placedUnits.length,
      unitCount: units.length,
      totalFootprintSquareMeters: round1(
        run.placedUnits.reduce((sum2, placed) => sum2 + placed.unit.floorAreaM2, 0)
      ),
      totalScore: round1(run.totalScore),
      roadCount: roadZones.length,
      terrainAware: Boolean(difficultyGrid),
      rules
    },
    warnings,
    notes
  };
}
function shouldSkipDetachedWelfare(placed, placedUnits) {
  if (placed.unit.facilityTypeId !== "welfare-zone" || placed.flushMerged) {
    return false;
  }
  return placedUnits.some(
    (other) => other.unit.facilityTypeId === "welfare-zone" && distance3(placed.center, other.center) <= WELFARE_DEDUP_RADIUS_M
  );
}
function runPlacement(units, scan, grid, sampleGround, anchors, preExisting = []) {
  const placedUnits = [...preExisting];
  const newPlaced = [];
  const unitSummaries = [];
  const warnings = [];
  let totalScore = 0;
  let entryIndex = 0;
  const mainUnits = units.filter((unit2) => unit2.category !== "infrastructure");
  const infraBase = units.find((unit2) => unit2.category === "infrastructure");
  for (const unit2 of mainUnits) {
    const anchor = unit2.category === "entry" ? anchors[entryIndex++ % Math.max(1, anchors.length)] : void 0;
    const placed = placeUnit(unit2, scan, placedUnits, grid, sampleGround, anchor);
    if (!placed) {
      unitSummaries.push(unplacedSummary(unit2, "\uACBD\uACC4 \uC548\uC5D0 \uBC30\uCE58\uD560 \uACF5\uAC04\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4."));
      warnings.push(`${unit2.label}\uC744(\uB97C) \uACBD\uACC4 \uC548\uC5D0 \uBC30\uCE58\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4(\uACF5\uAC04 \uBD80\uC871, \uD544\uC694 ${Math.round(unit2.floorAreaM2)}\u33A1).`);
      totalScore += UNPLACED_PENALTY;
      continue;
    }
    if (shouldSkipDetachedWelfare(placed, placedUnits)) {
      unitSummaries.push(unplacedSummary(unit2, "300m \uC548\uC5D0 \uBCF5\uC9C0 \uAD6C\uC5ED\uC774 \uC774\uBBF8 \uC788\uC5B4 \uB3C5\uB9BD \uBC30\uCE58\uB97C \uC0DD\uB7B5\uD588\uC2B5\uB2C8\uB2E4."));
      continue;
    }
    placedUnits.push(placed);
    newPlaced.push(placed);
    unitSummaries.push(placedSummary(placed));
    totalScore += placed.score;
  }
  if (infraBase) {
    const infraResult = placeInfrastructure(infraBase, scan, placedUnits, grid);
    placedUnits.push(...infraResult.placed);
    newPlaced.push(...infraResult.placed);
    unitSummaries.push(...infraResult.summaries);
    warnings.push(...infraResult.warnings);
    totalScore += infraResult.score;
  }
  return { placedUnits: newPlaced, unitSummaries, warnings, totalScore };
}
function buildOrderings(units) {
  const entries = units.filter((unit2) => unit2.category === "entry");
  const infra = units.filter((unit2) => unit2.category === "infrastructure");
  const middle = units.filter((unit2) => unit2.category !== "entry" && unit2.category !== "infrastructure");
  const areaDesc = [...middle].sort((a, b) => b.floorAreaM2 - a.floorAreaM2);
  return [
    [...entries, ...middle, ...infra],
    [...entries, ...areaDesc, ...infra]
  ];
}
function placeUnit(unit2, scan, placedUnits, grid, sampleGround, anchor) {
  const baseFloors = unit2.fixedFloors ?? chooseFloors(unit2.floorAreaM2, scan, placedUnits.map((placed) => placed.box), grid, sampleGround);
  const floorsLadder = unit2.fixedFloors ? [unit2.fixedFloors] : Array.from(
    new Set(
      Array.from(
        { length: BUILDING_ZONE_MAX_FLOORS },
        (_, index) => Math.min(BUILDING_ZONE_MAX_FLOORS, Math.max(1, baseFloors + index))
      )
    )
  );
  for (const fine of [false, true]) {
    const context = fine ? refineScanContext(scan) : scan;
    for (const floors of floorsLadder) {
      const placed = attemptPlaceUnit(unit2, floors, context, placedUnits, grid, anchor);
      if (placed) {
        return placed;
      }
    }
  }
  return null;
}
function refineScanContext(scan) {
  return { ...scan, stepX: Math.max(1, scan.stepX / 2), stepY: Math.max(1, scan.stepY / 2) };
}
function attemptPlaceUnit(unit2, floors, scan, placedUnits, grid, anchor) {
  const footprintArea = unit2.floorAreaM2 / Math.max(1, floors);
  const rect = sizeRect(footprintArea, scan.usableWidth);
  const scanBest = scanBestPosition(rect, unit2, scan, placedUnits, grid, anchor);
  const flushBest = unit2.groupKey ? findBestGroupFlush(rect, unit2, scan, placedUnits, grid, anchor) : null;
  const preferFlush = flushBest && (unit2.attachRequired || !scanBest || flushBest.score <= scanBest.score + FLUSH_SCORE_TOLERANCE);
  let chosen = null;
  if (preferFlush && flushBest) {
    chosen = { rect: flushBest.rect, score: flushBest.score, flush: flushBest.partner };
  } else if (scanBest) {
    chosen = { rect: scanBest.rect, score: scanBest.score, flush: null };
  }
  if (!chosen) {
    return null;
  }
  let polygon = rectCorners(chosen.rect);
  let score = chosen.score;
  if (!chosen.flush && !unit2.groupKey && grid) {
    const refined = refineShape(chosen.rect, unit2, scan, placedUnits, grid, score, anchor);
    polygon = refined.polygon;
    score = refined.score;
  }
  const box = boundingRect(polygon);
  const placed = {
    unit: unit2,
    center: rectCenter(box),
    polygon,
    box,
    floors,
    score,
    flushMerged: Boolean(chosen.flush),
    anchor
  };
  if (chosen.flush) {
    chosen.flush.flushMerged = true;
  }
  return placed;
}
function scanBestPosition(rect, unit2, scan, placedUnits, grid, anchor) {
  const placedBoxes = placedUnits.map((placed) => placed.box);
  let best = null;
  for (const variant of rectOrientations(rect)) {
    forEachPosition(variant, scan, (x, y) => {
      const candidate = { x, y, width: variant.width, height: variant.height };
      if (!isRectPlaceable(candidate, scan, placedBoxes)) {
        return false;
      }
      const score = scoreCandidate(candidate, unit2, placedUnits, grid, anchor, scan.maximizeSiteUsage, scan.siteCore, scan.pullFreeRadiusM);
      if (!best || score < best.score - TIE_EPSILON) {
        best = { rect: candidate, score };
      }
      return false;
    });
  }
  return best;
}
function rectOrientations(rect) {
  if (Math.abs(rect.width - rect.height) < 0.01) {
    return [rect];
  }
  return [rect, { ...rect, width: rect.height, height: rect.width }];
}
function scoreCandidate(rect, unit2, placedUnits, grid, anchor, maximizeSiteUsage = false, siteCore, pullFreeRadiusM) {
  const center = rectCenter(rect);
  let score = grid ? terrainScoreForRect(grid, rect) : 0;
  if (anchor) {
    const deviation = distance3(center, anchor) / ENTRY_ANCHOR_DISTANCE_M;
    return score + deviation * deviation;
  }
  score += cohesionScore(center, unit2, placedUnits, siteCore, pullFreeRadiusM, maximizeSiteUsage);
  score += entryClearPenalty(rect, placedUnits);
  return score;
}
function cohesionScore(center, unit2, placedUnits, siteCore, pullFreeRadiusM, maximize = false) {
  let bestAffinity = Infinity;
  let nearest = Infinity;
  for (const placed of placedUnits) {
    if (placed.unit.category === "entry" || PARKING_FACILITY_TYPE_IDS.has(placed.unit.facilityTypeId)) {
      continue;
    }
    const sameGroup = Boolean(unit2.groupKey) && placed.unit.groupKey === unit2.groupKey;
    const distanceM = distance3(center, placed.center);
    if (!(maximize && sameGroup)) {
      nearest = Math.min(nearest, distanceM);
    }
    const reference = pairReferenceDistance(unit2, placed.unit);
    if (reference !== null && (!maximize || sameGroup)) {
      bestAffinity = Math.min(bestAffinity, distanceM / reference);
    }
  }
  let score = 0;
  if (Number.isFinite(bestAffinity)) {
    score += bestAffinity;
  }
  if (nearest !== Infinity) {
    if (maximize) {
      score += NEIGHBOR_DISTANCE_M / nearest;
    } else {
      const spread = nearest / NEIGHBOR_DISTANCE_M;
      score += spread * spread;
    }
    if (siteCore && pullFreeRadiusM !== void 0) {
      const over = Math.max(0, distance3(center, siteCore) - pullFreeRadiusM);
      const pull = over / NEIGHBOR_DISTANCE_M;
      score += pull * pull;
    }
  } else {
    const seed = siteCore ? distance3(center, siteCore) / NEIGHBOR_DISTANCE_M : 0;
    score += seed * seed;
  }
  return score;
}
function terrainScoreForRect(grid, rect) {
  return difficultyForRect(grid, rect) / SLOPE_REFERENCE2 * TERRAIN_WEIGHT + normalizedElevationForRect(grid, rect) * ELEVATION_WEIGHT;
}
function pairReferenceDistance(a, b) {
  if (a.groupKey && a.groupKey === b.groupKey) {
    return SAME_GROUP_DISTANCE_M;
  }
  if (a.category === b.category) {
    return SAME_CATEGORY_DISTANCE_M;
  }
  if (isCareAffinityPair(a.category, b.category)) {
    return AFFINITY_DISTANCE_M;
  }
  return null;
}
function isCareAffinityPair(a, b) {
  return a === "care" && CARE_AFFINITY_CATEGORIES.has(b) || b === "care" && CARE_AFFINITY_CATEGORIES.has(a);
}
function placedCentroid(placedUnits) {
  const sum2 = placedUnits.reduce(
    (acc, placed) => ({ x: acc.x + placed.center.x, y: acc.y + placed.center.y }),
    { x: 0, y: 0 }
  );
  return { x: sum2.x / placedUnits.length, y: sum2.y / placedUnits.length };
}
function findBestGroupFlush(rect, unit2, scan, placedUnits, grid, anchor) {
  const groupPartners = placedUnits.filter(
    (placed) => placed.unit.groupKey === unit2.groupKey && isAxisAlignedRect(placed.polygon)
  );
  if (groupPartners.length === 0) {
    return null;
  }
  const groupBoxes = new Set(groupPartners.map((partner) => partner.box));
  let best = null;
  for (const partner of groupPartners) {
    const partnerBox = partner.box;
    for (const variant of rectOrientations(rect)) {
      for (const align of [0, 0.5, 1]) {
        const alignedY = partnerBox.y + (partnerBox.height - variant.height) * align;
        const alignedX = partnerBox.x + (partnerBox.width - variant.width) * align;
        const candidates = [
          { x: partnerBox.x + partnerBox.width, y: alignedY, width: variant.width, height: variant.height },
          { x: partnerBox.x - variant.width, y: alignedY, width: variant.width, height: variant.height },
          { x: alignedX, y: partnerBox.y + partnerBox.height, width: variant.width, height: variant.height },
          { x: alignedX, y: partnerBox.y - variant.height, width: variant.width, height: variant.height }
        ];
        for (const candidate of candidates) {
          const rounded = {
            x: round1(candidate.x),
            y: round1(candidate.y),
            width: candidate.width,
            height: candidate.height
          };
          if (!isGroupFlushPlaceable(rounded, groupBoxes, scan, placedUnits)) {
            continue;
          }
          const score = scoreCandidate(rounded, unit2, placedUnits, grid, anchor, scan.maximizeSiteUsage, scan.siteCore, scan.pullFreeRadiusM);
          if (!best || score < best.score - TIE_EPSILON) {
            best = { rect: rounded, score, partner };
          }
        }
      }
    }
  }
  return best;
}
function isGroupFlushPlaceable(rect, groupBoxes, scan, placedUnits) {
  for (const placed of placedUnits) {
    const gap = groupBoxes.has(placed.box) ? -0.01 : COL_GAP_METERS;
    if (rectsOverlapWithGap(rect, placed.box, gap)) {
      return false;
    }
  }
  if (scan.blockedBoxes.some((other) => rectsOverlapWithGap(rect, other, COL_GAP_METERS))) {
    return false;
  }
  return isPolygonInsidePolygon(rectCorners(rect), scan.boundary, 1);
}
function refineShape(rect, unit2, scan, placedUnits, grid, baseScore, anchor) {
  const placedBoxes = placedUnits.map((placed) => placed.box);
  const footprintArea = rect.width * rect.height;
  let bestPolygon = rectCorners(rect);
  let bestScore = baseScore;
  for (const template of footprintTemplates(footprintArea)) {
    const polygon = template.map((point) => ({ x: point.x + rect.x, y: point.y + rect.y }));
    if (!isPolygonPlaceable(polygon, scan, placedBoxes)) {
      continue;
    }
    const box = boundingRect(polygon);
    let score = difficultyForPolygon(grid, polygon) / SLOPE_REFERENCE2 * TERRAIN_WEIGHT;
    score += normalizedElevationForRect(grid, box) * ELEVATION_WEIGHT;
    score += scoreCandidate(box, unit2, placedUnits, null, anchor, scan.maximizeSiteUsage, scan.siteCore, scan.pullFreeRadiusM);
    if (score < bestScore - TIE_EPSILON) {
      bestScore = score;
      bestPolygon = polygon;
    }
  }
  return { polygon: bestPolygon, score: bestScore };
}
function chooseFloors(totalArea, scan, placedBoxes, grid, sampleGround) {
  if (!grid || !sampleGround) {
    return 2;
  }
  let bestFloors = 2;
  let bestRank = Infinity;
  let bestSiteCost = Infinity;
  for (let floors = 2; floors <= BUILDING_ZONE_MAX_FLOORS; floors += 1) {
    const rect = sizeRect(totalArea / floors, scan.usableWidth);
    const spot = scanMinSlopeSpot(rect, scan, placedBoxes, grid);
    if (!spot) {
      continue;
    }
    const footprint = rectCorners({ x: spot.x, y: spot.y, width: rect.width, height: rect.height });
    const earthwork = computeEarthwork(footprint, floors, sampleGround, DEFAULT_EARTHWORK_CONFIG, {
      gradedBoundary: offsetPolygonOutward(footprint, WALKWAY_WIDTH_METERS)
    });
    if (!earthwork) {
      continue;
    }
    const rank = DIFFICULTY_BAND_RANK[earthwork.difficulty];
    if (rank < bestRank || rank === bestRank && earthwork.siteCostPerPersonKrw < bestSiteCost - 1) {
      bestRank = rank;
      bestSiteCost = earthwork.siteCostPerPersonKrw;
      bestFloors = floors;
    }
  }
  return bestFloors;
}
function scanMinSlopeSpot(rect, scan, placedBoxes, grid) {
  let found = false;
  let bestX = 0;
  let bestY = 0;
  let bestDifficulty = Infinity;
  forEachPosition(rect, scan, (x, y) => {
    const candidate = { x, y, width: rect.width, height: rect.height };
    if (!isRectPlaceable(candidate, scan, placedBoxes)) {
      return false;
    }
    const difficulty = difficultyForRect(grid, candidate);
    if (!found || difficulty < bestDifficulty) {
      found = true;
      bestX = x;
      bestY = y;
      bestDifficulty = difficulty;
    }
    return difficulty <= TIE_EPSILON;
  });
  return found ? { x: bestX, y: bestY } : null;
}
function resolveEntryAnchors(boundary, externalRoadPoints) {
  const deduped = [];
  for (const point of externalRoadPoints ?? []) {
    if (deduped.every((existing) => distance3(existing, point) > 50)) {
      deduped.push(point);
    }
  }
  if (deduped.length > 0) {
    return deduped;
  }
  let bestMid = boundary[0];
  let bestLength = -1;
  for (let index = 0; index < boundary.length; index += 1) {
    const a = boundary[index];
    const b = boundary[(index + 1) % boundary.length];
    const length = distance3(a, b);
    if (length > bestLength) {
      bestLength = length;
      bestMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  }
  return [bestMid];
}
function centroidOf(points) {
  const n = Math.max(1, points.length);
  return {
    x: points.reduce((sum2, point) => sum2 + point.x, 0) / n,
    y: points.reduce((sum2, point) => sum2 + point.y, 0) / n
  };
}
function siteCoreOf(boundary) {
  const { center } = polygonCentroidAndArea(boundary);
  if (arePointsInsidePolygon([center], boundary)) {
    return center;
  }
  const rect = boundingRect(boundary);
  const steps = 32;
  let best = center;
  let bestClearance = -Infinity;
  for (let j = 0; j <= steps; j += 1) {
    for (let i = 0; i <= steps; i += 1) {
      const point = { x: rect.x + rect.width * i / steps, y: rect.y + rect.height * j / steps };
      if (!arePointsInsidePolygon([point], boundary)) {
        continue;
      }
      const clearance = distance3(point, nearestPointOnPolygonBoundary(point, boundary));
      if (clearance > bestClearance) {
        bestClearance = clearance;
        best = point;
      }
    }
  }
  return best;
}
function entryCenterOf(points, boundary) {
  if (points.length <= 2) {
    return centroidOf(points);
  }
  const center = smallestEnclosingCircleCenter(points);
  if (arePointsInsidePolygon([center], boundary)) {
    return center;
  }
  return nearestPointOnPolygonBoundary(center, boundary);
}
function smallestEnclosingCircleCenter(points) {
  const EPS = 1e-6;
  const enclosingRadius = (center) => {
    let radius = 0;
    for (const point of points) {
      radius = Math.max(radius, distance3(center, point));
    }
    return radius;
  };
  let bestCenter = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  let bestRadius = enclosingRadius(bestCenter);
  const consider = (center) => {
    const radius = enclosingRadius(center);
    if (radius < bestRadius - EPS) {
      bestCenter = center;
      bestRadius = radius;
    }
  };
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      consider({ x: (points[i].x + points[j].x) / 2, y: (points[i].y + points[j].y) / 2 });
      for (let k = j + 1; k < points.length; k += 1) {
        const circumcenter2 = circumcenterOf(points[i], points[j], points[k]);
        if (circumcenter2) {
          consider(circumcenter2);
        }
      }
    }
  }
  return bestCenter;
}
function circumcenterOf(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) {
    return null;
  }
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  return {
    x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d,
    y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d
  };
}
function nearestPointOnPolygonBoundary(point, boundary) {
  let best = boundary[0];
  let bestDist = Infinity;
  for (let i = 0; i < boundary.length; i += 1) {
    const candidate = projectPointOntoSegment(point, boundary[i], boundary[(i + 1) % boundary.length]);
    const d = distance3(point, candidate);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best;
}
function projectPointOntoSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return a;
  }
  const s = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
  return { x: a.x + dx * s, y: a.y + dy * s };
}
function polygonArea(points) {
  let sum2 = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    sum2 += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum2) / 2;
}
function extractExistingPlacement(existingZones) {
  const units = [];
  const deductCounts = /* @__PURE__ */ new Map();
  const entryCenters = [];
  let hasGuard = false;
  for (const zone of existingZones) {
    if (zone.kind !== "facility" || zone.shape === "road" || zone.points.length < 3) {
      continue;
    }
    const facilityTypeId = zone.facilityTypeId ?? "";
    const box = boundingRect(zone.points);
    const floors = zone.floors ?? 1;
    const preUnit = {
      key: `existing-${zone.id}`,
      category: zone.category,
      facilityTypeId,
      label: zone.label,
      personnel: zone.properties?.capacity ?? 0,
      floorAreaM2: polygonArea(zone.points) * Math.max(1, floors)
    };
    units.push({
      unit: preUnit,
      center: rectCenter(box),
      polygon: zone.points,
      box,
      floors,
      score: 0,
      flushMerged: false,
      preExisting: true
    });
    if (facilityTypeId === "security-zone") {
      hasGuard = true;
    }
    if (zone.category === "entry" && facilityTypeId === "entry-zone") {
      entryCenters.push(rectCenter(box));
    }
    if (facilityTypeId === "security-zone" || PARKING_FACILITY_TYPE_IDS.has(facilityTypeId)) {
      continue;
    }
    deductCounts.set(facilityTypeId, (deductCounts.get(facilityTypeId) ?? 0) + 1);
  }
  return { units, deductCounts, entryCenters, hasGuard };
}
function removeOccupiedAnchors(anchors, entryCenters) {
  const remaining = [...anchors];
  for (const center of entryCenters) {
    let bestIndex = -1;
    let bestDist = Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const d = distance3(remaining[index], center);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = index;
      }
    }
    if (bestIndex >= 0) {
      remaining.splice(bestIndex, 1);
    }
  }
  return remaining;
}
function deductExistingUnits(units, deductCounts) {
  if (deductCounts.size === 0) {
    return units;
  }
  const remaining = new Map(deductCounts);
  const result = [];
  for (const unit2 of units) {
    const left = remaining.get(unit2.facilityTypeId) ?? 0;
    if (left > 0) {
      remaining.set(unit2.facilityTypeId, left - 1);
      continue;
    }
    result.push(unit2);
  }
  return result;
}
function placeInfrastructure(base, scan, placedUnits, grid) {
  const warnings = [];
  let lastAttempt = [];
  let lastSummaries = [];
  let lastScore = 0;
  for (let count = 1; count <= INFRA_MAX_UNITS; count += 1) {
    const units = count === 1 ? [base] : splitInfraUnit(base, count);
    const attempt = [];
    const summaries = [];
    let score = 0;
    for (const unit2 of units) {
      const combined = [...placedUnits, ...attempt];
      const uncovered = uncoveredUnits(placedUnits, attempt);
      const target = uncovered.length > 0 ? placedCentroid(uncovered) : void 0;
      const placed = placeInfraUnit(unit2, scan, combined, grid, target);
      if (!placed) {
        summaries.push(unplacedSummary(unit2, "\uC678\uACFD\uC5D0 \uBC30\uCE58\uD560 \uACF5\uAC04\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4."));
        score += UNPLACED_PENALTY;
        continue;
      }
      attempt.push(placed);
      summaries.push(placedSummary(placed));
      score += placed.score;
    }
    lastAttempt = attempt;
    lastSummaries = summaries;
    lastScore = score;
    const stillUncovered = uncoveredUnits(placedUnits, attempt);
    if (stillUncovered.length === 0 && attempt.length === units.length) {
      return { placed: attempt, summaries, warnings, score };
    }
    if (count === INFRA_MAX_UNITS) {
      const names = stillUncovered.map((placed) => placed.unit.label).join(", ");
      warnings.push(
        `\uC778\uD504\uB77C ${INFRA_MAX_UNITS}\uAC1C \uBD84\uD560\uB85C\uB3C4 700m \uCEE4\uBC84\uB9AC\uC9C0\uB97C \uB9CC\uC871\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4${names ? ` (\uBBF8\uCEE4\uBC84: ${names})` : ""}. \uBD80\uC9C0 \uD615\uC0C1 \uB610\uB294 \uC778\uD504\uB77C \uADDC\uBAA8\uB97C \uC870\uC815\uD558\uC138\uC694.`
      );
    }
  }
  return { placed: lastAttempt, summaries: lastSummaries, warnings, score: lastScore };
}
function uncoveredUnits(placedUnits, infraUnits) {
  const targets = placedUnits.filter(
    (placed) => placed.unit.category !== "entry" && !PARKING_FACILITY_TYPE_IDS.has(placed.unit.facilityTypeId)
  );
  if (infraUnits.length === 0) {
    return targets;
  }
  return targets.filter(
    (placed) => infraUnits.every((infra) => distance3(placed.center, infra.center) > INFRA_COVER_RADIUS_M)
  );
}
function placeInfraUnit(unit2, scan, placedUnits, grid, coverTarget) {
  const floors = unit2.fixedFloors ?? 1;
  const rect = sizeRect(unit2.floorAreaM2 / Math.max(1, floors), scan.usableWidth);
  const placedBoxes = placedUnits.map((placed) => placed.box);
  const nonInfraBoxes = placedUnits.filter((placed) => placed.unit.category !== "infrastructure" && placed.unit.category !== "entry").map((placed) => placed.box);
  let best = null;
  forEachPosition(rect, scan, (x, y) => {
    const candidate = { x, y, width: rect.width, height: rect.height };
    if (!isRectPlaceable(candidate, scan, placedBoxes)) {
      return false;
    }
    const center = rectCenter(candidate);
    let score = grid ? difficultyForRect(grid, candidate) / SLOPE_REFERENCE2 * TERRAIN_WEIGHT : 0;
    if (nonInfraBoxes.length > 0) {
      const nearestGapM = Math.min(...nonInfraBoxes.map((box2) => rectGapDistance(candidate, box2)));
      const adjacency = nearestGapM / INFRA_ADJACENCY_SCALE_M;
      score += adjacency * adjacency;
    }
    if (coverTarget) {
      const coverDistance = distance3(center, coverTarget);
      score += Math.max(0, (coverDistance - INFRA_COVER_RADIUS_M * 0.8) / 100) ** 2;
    }
    score += entryClearPenalty(candidate, placedUnits);
    if (!best || score < best.score - TIE_EPSILON) {
      best = { rect: candidate, score };
    }
    return false;
  });
  if (!best) {
    return null;
  }
  const bestFound = best;
  const polygon = rectCorners(bestFound.rect);
  const box = boundingRect(polygon);
  return {
    unit: unit2,
    center: rectCenter(box),
    polygon,
    box,
    floors,
    score: bestFound.score,
    flushMerged: false
  };
}
function placeParkingZones(placedUnits, scan, weight) {
  const parkingType = findFacilityTypeById("parking-zone");
  if (!parkingType) {
    return { zones: [], boxes: [], warnings: [] };
  }
  const militaryType = findFacilityTypeById("vehicle-parking-zone") ?? parkingType;
  const zones = [];
  const warnings = [];
  const extraBoxes = [];
  const boxes = [];
  for (const placed of placedUnits) {
    if (placed.preExisting) {
      continue;
    }
    if (PARKING_EXCLUDED_CATEGORIES.has(placed.unit.category)) {
      continue;
    }
    if (placed.unit.facilityTypeId === "hygiene-zone" || placed.unit.facilityTypeId === "welfare-zone") {
      continue;
    }
    const isMilitary = placed.unit.category === "vehicle";
    const ratio = isMilitary ? MAINTENANCE_PARKING_RATIO : PARKING_RATIO;
    const stalls = Math.ceil(placed.unit.personnel * ratio * weight);
    if (stalls <= 0) {
      continue;
    }
    const baseDepth = isMilitary ? MILITARY_PARKING_DEPTH_M : PARKING_DEPTH_M;
    const periodM = isMilitary ? MILITARY_PARKING_DEPTH_PERIOD_M : PARKING_DEPTH_PERIOD_M;
    const areaM2 = stalls * (isMilitary ? MILITARY_PARKING_AREA_PER_STALL_M2 : PARKING_AREA_PER_STALL_M2);
    const candidate = findAttachedParkingRect(placed, areaM2, baseDepth, periodM, scan, placedUnits, extraBoxes) ?? findNearbyParkingRect(placed, areaM2, baseDepth, periodM, scan, placedUnits, extraBoxes);
    if (!candidate) {
      warnings.push(`${placed.unit.label}\uC758 \uC8FC\uCC28\uC7A5(\uC57D ${stalls}\uBA74)\uC744 \uAC74\uBB3C \uADFC\uCC98\uC5D0 \uBC30\uCE58\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.`);
      continue;
    }
    const facilityType = isMilitary ? militaryType : parkingType;
    const polygon = rectCorners(candidate);
    const parkingZone = createSiteZone(createFacilityZoneTool(facilityType), polygon, {
      floors: 0
    });
    parkingZone.label = `${placed.unit.label} \uC8FC\uCC28\uC7A5`;
    parkingZone.properties = createDefaultZoneProperties(stalls);
    zones.push(parkingZone);
    extraBoxes.push(candidate);
    boxes.push({ rect: candidate, owner: placed });
  }
  return { zones, boxes, warnings };
}
function parkingDepthForModules(baseDepth, periodM, modules) {
  return baseDepth + (modules - 1) * periodM;
}
function parkingBandForSide(areaM2, baseDepth, periodM, sideLength) {
  for (let modules = 1; modules <= PARKING_MAX_MODULES; modules += 1) {
    const depth2 = parkingDepthForModules(baseDepth, periodM, modules);
    const along = areaM2 / depth2;
    if (along <= sideLength) {
      return { along: Math.max(along, 5), depth: depth2 };
    }
  }
  const depth = parkingDepthForModules(baseDepth, periodM, PARKING_MAX_MODULES);
  return { along: Math.max(areaM2 / depth, 5), depth };
}
function findAttachedParkingRect(placed, areaM2, baseDepth, periodM, scan, placedUnits, extraBoxes) {
  const box = placed.box;
  const horizontalBand = parkingBandForSide(areaM2, baseDepth, periodM, box.width);
  const verticalBand = parkingBandForSide(areaM2, baseDepth, periodM, box.height);
  const candidates = [];
  for (const align of [0, 0.5, 1]) {
    const alignedX = box.x + (box.width - horizontalBand.along) * align;
    const alignedY = box.y + (box.height - verticalBand.along) * align;
    candidates.push(
      {
        x: alignedX,
        y: box.y - horizontalBand.depth - PARKING_WALKWAY_GAP_M,
        width: horizontalBand.along,
        height: horizontalBand.depth
      },
      {
        x: alignedX,
        y: box.y + box.height + PARKING_WALKWAY_GAP_M,
        width: horizontalBand.along,
        height: horizontalBand.depth
      },
      {
        x: box.x + box.width + PARKING_WALKWAY_GAP_M,
        y: alignedY,
        width: verticalBand.depth,
        height: verticalBand.along
      },
      {
        x: box.x - verticalBand.depth - PARKING_WALKWAY_GAP_M,
        y: alignedY,
        width: verticalBand.depth,
        height: verticalBand.along
      }
    );
  }
  for (const candidate of candidates) {
    const rounded = roundRect(candidate);
    if (isParkingRectPlaceable(rounded, scan, placedUnits, extraBoxes)) {
      return rounded;
    }
  }
  return null;
}
function findNearbyParkingRect(placed, areaM2, baseDepth, periodM, scan, placedUnits, extraBoxes) {
  const center = placed.center;
  let best = null;
  for (let modules = 1; modules <= PARKING_MAX_MODULES; modules += 1) {
    const depth = parkingDepthForModules(baseDepth, periodM, modules);
    const along = Math.max(areaM2 / depth, 5);
    for (const variant of rectOrientations({ x: 0, y: 0, width: round1(along), height: round1(depth) })) {
      forEachPosition(variant, scan, (x, y) => {
        const candidate = { x, y, width: variant.width, height: variant.height };
        const candidateDistance = distance3(rectCenter(candidate), center);
        if (candidateDistance > PARKING_NEARBY_RADIUS_M) {
          return false;
        }
        if (best && candidateDistance >= best.distanceM) {
          return false;
        }
        const rounded = roundRect(candidate);
        if (isParkingRectPlaceable(rounded, scan, placedUnits, extraBoxes)) {
          best = { rect: rounded, distanceM: candidateDistance };
        }
        return false;
      });
    }
  }
  return best ? best.rect : null;
}
function isParkingRectPlaceable(rect, scan, placedUnits, extraBoxes) {
  if (!isPolygonInsidePolygon(rectCorners(rect), scan.boundary, 1)) {
    return false;
  }
  for (const other of placedUnits) {
    if (rectsOverlapWithGap(rect, other.box, PARKING_WALKWAY_GAP_M - 0.01)) {
      return false;
    }
  }
  for (const other of scan.blockedBoxes) {
    if (rectsOverlapWithGap(rect, other, PARKING_WALKWAY_GAP_M - 0.01)) {
      return false;
    }
  }
  for (const other of extraBoxes) {
    if (rectsOverlapWithGap(rect, other, -0.01)) {
      return false;
    }
  }
  return true;
}
function roundRect(rect) {
  return {
    x: round1(rect.x),
    y: round1(rect.y),
    width: round1(rect.width),
    height: round1(rect.height)
  };
}
function placeGuardPosts(boundary, placedUnits, parkingBoxes, spacingM, blockedBoxes = []) {
  const securityType = findFacilityTypeById("security-zone");
  if (!securityType) {
    return { zones: [], warnings: [], count: 0, placedCount: 0 };
  }
  const securityTool = createFacilityZoneTool(securityType);
  const perimeter = polygonPerimeter(boundary);
  const count = Math.max(1, Math.ceil(perimeter / spacingM));
  const spacing = perimeter / count;
  const zones = [];
  const warnings = [];
  const blockers = [...placedUnits.map((placed) => placed.box), ...parkingBoxes, ...blockedBoxes];
  let placedCount = 0;
  for (let index = 0; index < count; index += 1) {
    const baseArc = index * spacing + spacing / 2;
    let rect = null;
    for (const offsetRatio of [0, 0.125, -0.125, 0.25, -0.25]) {
      const arc = normalizeArc(baseArc + spacing * offsetRatio, perimeter);
      const candidate = guardRectAtArc(boundary, arc);
      if (candidate && isPolygonInsidePolygon(rectCorners(candidate), boundary, 1) && blockers.every((box) => !rectsOverlapWithGap(candidate, box, 1))) {
        rect = candidate;
        break;
      }
    }
    if (!rect) {
      warnings.push(`\uACBD\uACC4 \uCD08\uC18C ${index + 1}\uC744(\uB97C) \uB458\uB808 \uADFC\uCC98\uC5D0 \uBC30\uCE58\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4(\uACF5\uAC04 \uBD80\uC871).`);
      continue;
    }
    const polygon = rectCorners(rect);
    const guardZone = createSiteZone(securityTool, polygon, {
      floors: GUARD_POST_FIXED_FLOORS
    });
    guardZone.label = `\uACBD\uACC4 \uAD6C\uC5ED ${index + 1}`;
    guardZone.properties = createDefaultZoneProperties(GUARD_POST_PERSONNEL);
    zones.push(guardZone);
    blockers.push(rect);
    placedCount += 1;
  }
  return { zones, warnings, count, placedCount };
}
function guardRectAtArc(boundary, arc) {
  const sample = pointAtArcLength(boundary, arc);
  if (!sample) {
    return null;
  }
  const inward = inwardNormal(boundary, sample.point, sample.direction);
  if (!inward) {
    return null;
  }
  const center = {
    x: sample.point.x + inward.x * GUARD_INSET_M,
    y: sample.point.y + inward.y * GUARD_INSET_M
  };
  return {
    x: round1(center.x - GUARD_SIDE_M / 2),
    y: round1(center.y - GUARD_SIDE_M / 2),
    width: GUARD_SIDE_M,
    height: GUARD_SIDE_M
  };
}
function polygonPerimeter(points) {
  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    total += distance3(points[index], points[(index + 1) % points.length]);
  }
  return total;
}
function normalizeArc(arc, perimeter) {
  const wrapped = arc % perimeter;
  return wrapped < 0 ? wrapped + perimeter : wrapped;
}
function pointAtArcLength(points, arc) {
  let remaining = arc;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const length = distance3(a, b);
    if (length <= 0) {
      continue;
    }
    if (remaining <= length) {
      const t = remaining / length;
      return {
        point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        direction: { x: (b.x - a.x) / length, y: (b.y - a.y) / length }
      };
    }
    remaining -= length;
  }
  return null;
}
function inwardNormal(boundary, point, direction) {
  const candidates = [
    { x: -direction.y, y: direction.x },
    { x: direction.y, y: -direction.x }
  ];
  for (const normal of candidates) {
    const probe = { x: point.x + normal.x * GUARD_INSET_M, y: point.y + normal.y * GUARD_INSET_M };
    if (arePointsInsidePolygon([probe], boundary, 0.1)) {
      return normal;
    }
  }
  return null;
}
function createUnitZones(placed) {
  const facilityType = findFacilityTypeById(placed.unit.facilityTypeId);
  if (!facilityType) {
    return [];
  }
  const facilityPoints = placed.flushMerged ? placed.polygon : insetPolygon(placed.polygon);
  const facilityZone = createSiteZone(createFacilityZoneTool(facilityType), facilityPoints, {
    floors: placed.floors
  });
  facilityZone.label = placed.unit.label;
  facilityZone.properties = createDefaultZoneProperties(placed.unit.personnel);
  return [facilityZone];
}
function buildRules(requirements, units, run, guard) {
  const rules = [];
  const placedByCategory = (category) => run.placedUnits.filter((placed) => placed.unit.category === category);
  const personnelSum = (list) => list.reduce((sum2, placed) => sum2 + placed.unit.personnel, 0);
  const command = placedByCategory("command");
  const commandTarget = Math.round(requirements.totalPersonnel * 0.3 * requirements.coreWeights.command);
  rules.push({
    id: "command-30",
    label: "\uC9C0\uD718+\uC0AC\uBB34 \uD569\uACC4 \uCD1D\uC6D0 30% \uC774\uC0C1",
    ok: personnelSum(command) >= commandTarget && new Set(command.map((placed) => placed.unit.facilityTypeId)).size >= 2,
    detail: personnelSum(command) >= commandTarget ? `\uBC30\uCE58 ${personnelSum(command)}\uBA85 / \uBAA9\uD45C ${commandTarget}\uBA85` : `\uBC30\uCE58 ${personnelSum(command)}\uBA85 < \uBAA9\uD45C ${commandTarget}\uBA85 \u2014 \uACF5\uAC04 \uBD80\uC871\uC73C\uB85C \uC77C\uBD80 \uC720\uB2DB\uC774 \uBE60\uC84C\uC2B5\uB2C8\uB2E4.`
  });
  const living = placedByCategory("living");
  const livingTypes = new Set(living.map((placed) => placed.unit.facilityTypeId));
  const livingOk = ["living-zone", "welfare-zone", "hygiene-zone"].every((type) => livingTypes.has(type));
  rules.push({
    id: "living-subcategories",
    label: "\uC0DD\uD65C-\uBCF5\uC9C0-\uC704\uC0DD \uC18C\uBC94\uC8FC 3\uC885 \uC874\uC7AC",
    ok: livingOk,
    detail: livingOk ? `\uADF8\uB8F9 ${new Set(living.map((placed) => placed.unit.groupKey)).size}\uAC1C\uB85C \uBD84\uC0B0 \uBC30\uCE58` : "\uC0DD\uD65C/\uBCF5\uC9C0/\uC704\uC0DD \uC911 \uC77C\uBD80\uB97C \uBC30\uCE58\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4(\uACF5\uAC04 \uBD80\uC871)."
  });
  const entry = placedByCategory("entry").filter((placed) => placed.unit.facilityTypeId === "entry-zone");
  rules.push({
    id: "entry-min",
    label: "\uCD9C\uC785 \uAD6C\uC5ED 1\uAC1C \uC774\uC0C1(\uC678\uBD80 \uB3C4\uB85C \uC811\uC810\uB9C8\uB2E4 1\uAC1C)",
    ok: entry.length >= 1,
    detail: entry.length >= 1 ? `\uCD9C\uC785 \uAD6C\uC5ED ${entry.length}\uAC1C \uBC30\uCE58` : "\uCD9C\uC785 \uAD6C\uC5ED\uC744 \uBC30\uCE58\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
  });
  const infra = placedByCategory("infrastructure");
  const uncovered = uncoveredUnits(
    run.placedUnits.filter((placed) => placed.unit.category !== "infrastructure"),
    infra
  );
  rules.push({
    id: "infra-coverage",
    label: "\uC778\uD504\uB77C 700m \uCEE4\uBC84\uB9AC\uC9C0",
    ok: infra.length > 0 && uncovered.length === 0,
    detail: infra.length === 0 ? "\uC778\uD504\uB77C \uAD6C\uC5ED\uC744 \uBC30\uCE58\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4." : uncovered.length === 0 ? `\uC778\uD504\uB77C ${infra.length}\uAC1C\uAC00 \uC804 \uAC74\uBB3C\uC744 \uCEE4\uBC84` : `\uBBF8\uCEE4\uBC84 \uAC74\uBB3C ${uncovered.length}\uAC1C: ${uncovered.map((placed) => placed.unit.label).join(", ")}`
  });
  if (!guard.enabled) {
    rules.push({ id: "guard-coverage", label: "\uACBD\uACC4 \uCD08\uC18C \u2014 \uC0AC\uC6A9 \uC548 \uD568", ok: true, detail: "\uBAA8\uB4C8 off" });
  } else {
    rules.push({
      id: "guard-coverage",
      label: `\uACBD\uACC4 \uCD08\uC18C \uB458\uB808 ${guard.spacingM}m \uAC04\uACA9 \uCEE4\uBC84`,
      ok: guard.placedCount >= guard.count,
      detail: `${guard.placedCount}/${guard.count}\uAC1C \uBC30\uCE58`
    });
  }
  const missing = units.filter(
    (unit2) => !run.placedUnits.some((placed) => placed.unit.key === unit2.key)
  );
  rules.push({
    id: "all-units",
    label: "\uC804 \uC720\uB2DB \uBC30\uCE58",
    ok: missing.length === 0,
    detail: missing.length === 0 ? `${run.placedUnits.length}\uAC1C \uC720\uB2DB \uC804\uBD80 \uBC30\uCE58` : `\uBBF8\uBC30\uCE58 ${missing.length}\uAC1C: ${missing.map((unit2) => unit2.label).join(", ")} \u2014 \uACBD\uACC4 \uACF5\uAC04 \uBD80\uC871.`
  });
  return rules;
}
function buildCategorySummaries(units, placedUnits) {
  const categories = [];
  for (const unit2 of units) {
    if (!categories.includes(unit2.category)) {
      categories.push(unit2.category);
    }
  }
  return categories.map((category) => {
    const categoryUnits = units.filter((unit2) => unit2.category === category);
    const placed = placedUnits.some((item) => item.unit.category === category);
    return {
      category,
      label: FACILITY_CATEGORY_LABELS[category],
      areaSquareMeters: round1(categoryUnits.reduce((sum2, unit2) => sum2 + unit2.floorAreaM2, 0)),
      placed
    };
  });
}
function placedSummary(placed) {
  return {
    key: placed.unit.key,
    label: placed.unit.label,
    category: placed.unit.category,
    personnel: placed.unit.personnel,
    floorAreaM2: placed.unit.floorAreaM2,
    placed: true,
    floors: placed.floors
  };
}
function unplacedSummary(unit2, reason) {
  return {
    key: unit2.key,
    label: unit2.label,
    category: unit2.category,
    personnel: unit2.personnel,
    floorAreaM2: unit2.floorAreaM2,
    placed: false,
    reason
  };
}
function emptySummary(terrainAware) {
  return {
    categories: [],
    units: [],
    placedCount: 0,
    unitCount: 0,
    totalFootprintSquareMeters: 0,
    totalScore: 0,
    roadCount: 0,
    terrainAware,
    rules: []
  };
}
function forEachPosition(rect, scan, visit) {
  const maxX = scan.usableX + scan.usableWidth - rect.width;
  const maxY = scan.usableY + scan.usableHeight - rect.height;
  if (maxX < scan.usableX - 0.01 || maxY < scan.usableY - 0.01) {
    return;
  }
  for (let y = scan.usableY; y <= maxY + 0.01; y += scan.stepY) {
    for (let x = scan.usableX; x <= maxX + 0.01; x += scan.stepX) {
      if (visit(round1(x), round1(y))) {
        return;
      }
    }
  }
}
function isRectPlaceable(rect, scan, placedBoxes) {
  if (placedBoxes.some((other) => rectsOverlapWithGap(rect, other, COL_GAP_METERS))) {
    return false;
  }
  if (scan.blockedBoxes.some((other) => rectsOverlapWithGap(rect, other, COL_GAP_METERS))) {
    return false;
  }
  return isPolygonInsidePolygon(rectCorners(rect), scan.boundary, 1);
}
function isPolygonPlaceable(polygon, scan, placedBoxes) {
  const box = boundingRect(polygon);
  if (placedBoxes.some((other) => rectsOverlapWithGap(box, other, COL_GAP_METERS))) {
    return false;
  }
  if (scan.blockedBoxes.some((other) => rectsOverlapWithGap(box, other, COL_GAP_METERS))) {
    return false;
  }
  return isPolygonInsidePolygon(polygon, scan.boundary, 1);
}
function sizeRect(areaSquareMeters, usableWidth) {
  let width = Math.sqrt(areaSquareMeters * ASPECT_RATIO);
  if (usableWidth > 0 && width > usableWidth) {
    width = usableWidth;
  }
  width = Math.max(MIN_CATEGORY_SIDE_METERS, width);
  const height = Math.max(MIN_CATEGORY_SIDE_METERS, areaSquareMeters / width);
  return { x: 0, y: 0, width: round1(width), height: round1(height) };
}
function rectsOverlapWithGap(a, b, gap) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}
function rectGapDistance(a, b) {
  const dx = Math.max(0, b.x - (a.x + a.width), a.x - (b.x + b.width));
  const dy = Math.max(0, b.y - (a.y + a.height), a.y - (b.y + b.height));
  return Math.hypot(dx, dy);
}
function isAxisAlignedRect(points) {
  if (points.length !== 4) {
    return false;
  }
  for (let index = 0; index < 4; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % 4];
    if (Math.abs(a.x - b.x) > 0.01 && Math.abs(a.y - b.y) > 0.01) {
      return false;
    }
  }
  return true;
}
function insetPolygon(footprint) {
  const box = boundingRect(footprint);
  const minSide = Math.min(box.width, box.height);
  if (minSide <= MIN_CATEGORY_SIDE_METERS) {
    return footprint.map((point) => ({ ...point }));
  }
  const inset = Math.min(FACILITY_INSET_METERS, minSide * 0.2);
  const scale2 = Math.max(0.4, 1 - 2 * inset / minSide);
  const center = rectCenter(box);
  return footprint.map(
    (point) => roundPoint2({
      x: center.x + (point.x - center.x) * scale2,
      y: center.y + (point.y - center.y) * scale2
    })
  );
}
function polygonCentroidAndArea(points) {
  let doubleArea = 0;
  let cx = 0;
  let cy = 0;
  for (let index = 0; index < points.length; index += 1) {
    const p = points[index];
    const q = points[(index + 1) % points.length];
    const cross = p.x * q.y - q.x * p.y;
    doubleArea += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(doubleArea) < 1e-9) {
    return { center: centroidOf(points), area: 0 };
  }
  return { center: { x: cx / (3 * doubleArea), y: cy / (3 * doubleArea) }, area: Math.abs(doubleArea) / 2 };
}
function roadGroupCenter(members, parking) {
  let totalArea = 0;
  let weightedX = 0;
  let weightedY = 0;
  for (const member of members) {
    const { center, area } = polygonCentroidAndArea(member.polygon);
    totalArea += area;
    weightedX += center.x * area;
    weightedY += center.y * area;
  }
  for (const rect of parking) {
    const area = rect.width * rect.height;
    const center = rectCenter(rect);
    totalArea += area;
    weightedX += center.x * area;
    weightedY += center.y * area;
  }
  if (totalArea <= 0) {
    return centroidOf(members.map((member) => member.center));
  }
  return { x: weightedX / totalArea, y: weightedY / totalArea };
}
function renderedGroupPolygons(members, parking) {
  return [
    ...members.map((member) => member.flushMerged ? member.polygon : insetPolygon(member.polygon)),
    ...parking.map((rect) => rectCorners(rect))
  ];
}
function trimPathAtPolygons(path, polygons, fromStart) {
  if (path.length < 2 || polygons.length === 0) {
    return path;
  }
  const points = fromStart ? path : [...path].reverse();
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const segmentLength = distance3(from, to);
    let bestRatio = -1;
    let bestHit = null;
    for (const polygon of polygons) {
      for (let vertex = 0; vertex < polygon.length; vertex += 1) {
        const hit = segmentIntersection(from, to, polygon[vertex], polygon[(vertex + 1) % polygon.length]);
        if (!hit) {
          continue;
        }
        const ratio = segmentLength > 0 ? distance3(from, hit) / segmentLength : 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestHit = hit;
        }
      }
    }
    if (!bestHit) {
      continue;
    }
    const trimmed = distance3(bestHit, to) < 1e-6 ? points.slice(index + 1) : [bestHit, ...points.slice(index + 1)];
    return fromStart ? trimmed : trimmed.reverse();
  }
  return path;
}
function routeRoadBetween(start, end, excluded, placedUnits, parkingBoxes, boundary, roadTool, grid, halfWidthM, lanes, routeKind, blockedPolygons = [], trimStartPolygons = [], trimEndPolygons = []) {
  const obstacles = [
    ...placedUnits.filter((placed) => !excluded.has(placed)).map((placed) => placed.polygon),
    // 제외 그룹 소유 주차만 빼고 타 그룹 주차는 장애물로 남긴다(도로가 남의 주차장을 우회, R8).
    ...parkingBoxes.filter((box) => !excluded.has(box.owner)).map((box) => rectCorners(box.rect)),
    // 실제로 서 있는 건물은 bbox가 아니라 원본 폴리곤 그대로 우회한다(A*는 형상을 그대로 쓴다).
    ...blockedPolygons
  ];
  let blocked = false;
  let path = routeRoadAroundObstacles(start, end, obstacles, boundary, { halfWidthM, grid });
  if (!path && grid) {
    path = routeRoadAroundObstacles(start, end, obstacles, boundary, { halfWidthM, grid: null });
  }
  if (!path) {
    blocked = true;
    logScaffoldaError("SCAFFOLDA_ROAD_ROUTE_BLOCKED", {
      input: { kind: routeKind, start, end },
      output: { fallback: "straight-line" }
    });
    path = [start, end];
  }
  if (trimStartPolygons.length > 0) {
    path = trimPathAtPolygons(path, trimStartPolygons, true);
  }
  if (trimEndPolygons.length > 0) {
    path = trimPathAtPolygons(path, trimEndPolygons, false);
  }
  if (calculatePathLength(path) < ROAD_MIN_LENGTH_METERS) {
    return { road: null, path, blocked };
  }
  const road = createSiteZone(roadTool, path.map(roundPoint2));
  road.road = updateRoadProperties(road.road, { direction: "two-way", lanes });
  return { road, path, blocked };
}
function connectGroups(a, b, placedUnits, parkingBoxes, boundary, roadTool, grid, halfWidthM, lanes, routeKind, blockedPolygons = []) {
  const excluded = /* @__PURE__ */ new Set([...a.members, ...b.members]);
  return routeRoadBetween(
    a.center,
    b.center,
    excluded,
    placedUnits,
    parkingBoxes,
    boundary,
    roadTool,
    grid,
    halfWidthM,
    lanes,
    routeKind,
    blockedPolygons,
    renderedGroupPolygons(a.members, a.parking),
    renderedGroupPolygons(b.members, b.parking)
  );
}
function createConnectorRoads(placedUnits, parkingBoxes, boundary, grid = null, blockedPolygons = []) {
  const roadTool = getRoadZoneTool();
  if (!roadTool) {
    return { roads: [], blockedCount: 0 };
  }
  const groups = clusterBySharedEdge(placedUnits, (placed) => placed.polygon).map((members) => {
    const parking = parkingBoxes.filter((box) => members.includes(box.owner)).map((box) => box.rect);
    return { members, parking, center: roadGroupCenter(members, parking) };
  });
  const nodeGroups = groups.filter((group) => group.members.every((member) => member.unit.category !== "entry"));
  const entryGroups = groups.filter(
    (group) => group.members.some((member) => member.unit.category === "entry" && member.anchor)
  );
  const roads = [];
  const roadPaths = [];
  let blockedCount = 0;
  const nodeCenters = nodeGroups.map((group) => group.center);
  const nodePersonnel = nodeGroups.map(
    (group) => group.members.reduce((sum2, member) => sum2 + member.unit.personnel, 0)
  );
  const prunedEdges = pruneRoadEdges(delaunayEdges(nodeCenters), nodeCenters, nodePersonnel);
  for (const [from, to] of prunedEdges) {
    const a = nodeGroups[from];
    const b = nodeGroups[to];
    if (a.members.every((member) => member.preExisting) && b.members.every((member) => member.preExisting)) {
      continue;
    }
    const built = connectGroups(a, b, placedUnits, parkingBoxes, boundary, roadTool, grid, AUTO_ROAD_HALF_WIDTH_M, 1, "connectorRoad", blockedPolygons);
    if (built.blocked) {
      blockedCount += 1;
    }
    if (built.road) {
      roads.push(built.road);
      roadPaths.push(built.path);
    }
  }
  for (const entryGroup of entryGroups) {
    const excluded = new Set(entryGroup.members);
    const target = nearestPointOnPaths(entryGroup.center, roadPaths);
    let built;
    if (target) {
      built = routeRoadBetween(
        entryGroup.center,
        target,
        excluded,
        placedUnits,
        parkingBoxes,
        boundary,
        roadTool,
        grid,
        ENTRY_ROAD_HALF_WIDTH_M,
        ENTRY_ROAD_LANES,
        "entryConnectorRoad",
        blockedPolygons,
        // 시작(출입 그룹 중심)만 자른다. 끝은 기존 도로 위 점이라 그대로 붙어야 접속이 유지된다.
        renderedGroupPolygons(entryGroup.members, entryGroup.parking)
      );
    } else {
      const nearest = nodeGroups.map((group) => ({ group, d: distance3(entryGroup.center, group.center) })).sort((x, y) => x.d - y.d)[0];
      if (!nearest) {
        continue;
      }
      built = connectGroups(
        entryGroup,
        nearest.group,
        placedUnits,
        parkingBoxes,
        boundary,
        roadTool,
        grid,
        ENTRY_ROAD_HALF_WIDTH_M,
        ENTRY_ROAD_LANES,
        "entryConnectorRoad",
        blockedPolygons
      );
    }
    if (built.blocked) {
      blockedCount += 1;
    }
    if (built.road) {
      built.road.label = "\uCD9C\uC785 \uC5F0\uACB0 \uB3C4\uB85C";
      roads.push(built.road);
      roadPaths.push(built.path);
    }
  }
  return { roads, blockedCount };
}
function nearestPointOnPaths(p, paths) {
  let best = null;
  let bestDist = Infinity;
  for (const path of paths) {
    for (let index = 0; index < path.length - 1; index += 1) {
      const candidate = projectPointOntoSegment(p, path[index], path[index + 1]);
      const d = distance3(p, candidate);
      if (d < bestDist) {
        bestDist = d;
        best = candidate;
      }
    }
  }
  return best;
}
function createEntryAccessRoads(placedUnits, parkingBoxes, boundary, grid = null, blockedPolygons = []) {
  const roadTool = getRoadZoneTool();
  if (!roadTool) {
    return { roads: [], blockedCount: 0 };
  }
  const roads = [];
  let blockedCount = 0;
  for (const placed of placedUnits) {
    if (placed.unit.category !== "entry" || !placed.anchor) {
      continue;
    }
    const built = routeRoadBetween(
      placed.center,
      placed.anchor,
      /* @__PURE__ */ new Set([placed]),
      placedUnits,
      parkingBoxes,
      boundary,
      roadTool,
      grid,
      ENTRY_ROAD_HALF_WIDTH_M,
      ENTRY_ROAD_LANES,
      "entryAccessRoad",
      blockedPolygons,
      // 시작(출입 건물 중심)만 자른다. 끝(anchor)은 외부 도로 접점이라 그대로 닿아야 한다.
      renderedGroupPolygons(
        [placed],
        parkingBoxes.filter((box) => box.owner === placed).map((box) => box.rect)
      )
    );
    if (built.blocked) {
      blockedCount += 1;
    }
    if (built.road) {
      built.road.label = "\uC9C4\uC785 \uB3C4\uB85C";
      roads.push(built.road);
    }
  }
  return { roads, blockedCount };
}
function calculatePathLength(path) {
  let total = 0;
  for (let index = 0; index < path.length - 1; index += 1) {
    total += distance3(path[index], path[index + 1]);
  }
  return total;
}
function getRoadZoneTool() {
  const roadFacilityType = findFacilityTypeById("road");
  return roadFacilityType ? createFacilityZoneTool(roadFacilityType) : null;
}
function delaunayEdges(points) {
  if (points.length < 3) {
    return minimumSpanningTreeEdges(points);
  }
  const delaunay = Delaunator.from(points, (point) => point.x, (point) => point.y);
  const { triangles, halfedges } = delaunay;
  if (triangles.length === 0) {
    return minimumSpanningTreeEdges(points);
  }
  const edges = [];
  for (let e = 0; e < triangles.length; e += 1) {
    if (e > halfedges[e]) {
      const next = e % 3 === 2 ? e - 2 : e + 1;
      edges.push([triangles[e], triangles[next]]);
    }
  }
  return edges;
}
function minimumSpanningTreeEdges(points) {
  const edges = [];
  const connected = /* @__PURE__ */ new Set([0]);
  while (connected.size < points.length) {
    let bestFrom = -1;
    let bestTo = -1;
    let bestDistance = Infinity;
    for (const from of connected) {
      for (let to = 0; to < points.length; to += 1) {
        if (connected.has(to)) {
          continue;
        }
        const candidateDistance = distance3(points[from], points[to]);
        if (candidateDistance < bestDistance) {
          bestDistance = candidateDistance;
          bestFrom = from;
          bestTo = to;
        }
      }
    }
    if (bestTo === -1) {
      break;
    }
    connected.add(bestTo);
    edges.push([bestFrom, bestTo]);
  }
  return edges;
}
function pruneRoadEdges(edges, centers, personnel) {
  const maxPersonnel = personnel.reduce((max, value) => Math.max(max, value), 0);
  const hubThreshold = maxPersonnel * ROAD_HUB_PERSONNEL_RATIO;
  const isHub = (index) => personnel[index] >= hubThreshold;
  return edges.filter(([from, to]) => {
    const bothHub = isHub(from) && isHub(to);
    const dpq = distance3(centers[from], centers[to]);
    for (let r = 0; r < centers.length; r += 1) {
      if (r === from || r === to) {
        continue;
      }
      const dpr = distance3(centers[from], centers[r]);
      const dqr = distance3(centers[to], centers[r]);
      if (bothHub) {
        if (dpr * dpr + dqr * dqr < dpq * dpq) {
          return false;
        }
      } else if (Math.max(dpr, dqr) < dpq) {
        return false;
      }
    }
    return true;
  });
}
function rectCorners(rect) {
  return [
    roundPoint2({ x: rect.x, y: rect.y }),
    roundPoint2({ x: rect.x + rect.width, y: rect.y }),
    roundPoint2({ x: rect.x + rect.width, y: rect.y + rect.height }),
    roundPoint2({ x: rect.x, y: rect.y + rect.height })
  ];
}
function rectCenter(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}
function pointToRectDistance(point, rect) {
  const clampedX = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
  const clampedY = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
  return Math.hypot(point.x - clampedX, point.y - clampedY);
}
function entryClearPenalty(rect, placedUnits) {
  for (const placed of placedUnits) {
    if (placed.unit.facilityTypeId !== "entry-zone") {
      continue;
    }
    if (pointToRectDistance(placed.center, rect) < ENTRY_CLEAR_RADIUS_M) {
      return ENTRY_CLEAR_PENALTY;
    }
  }
  return 0;
}
function boundingRect(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
function getBounds(points) {
  if (points.length < 3) {
    return null;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}
function distance3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function roundPoint2(point) {
  return { x: Math.round(point.x * 1e3) / 1e3, y: Math.round(point.y * 1e3) / 1e3 };
}
function routeRoadAroundObstacles(start, end, obstacles, boundary, options = {}) {
  const halfWidthM = options.halfWidthM ?? AUTO_ROAD_HALF_WIDTH_M;
  const grid = options.grid ?? null;
  const inflation = halfWidthM + ROAD_ROUTE_CLEARANCE_M;
  const inflated = obstacles.filter((polygon) => polygon.length >= 3).map((polygon) => offsetPolygonOutward(polygon, inflation));
  const isBlocked = (point) => inflated.some((polygon) => arePointsInsidePolygon([point], polygon, 0));
  if (segmentIsClear(start, end, isBlocked) && straightSlopeIsGentle(start, end, grid)) {
    return [{ ...start }, { ...end }];
  }
  const margin = ROAD_ROUTE_CELL_M * 12;
  const boundaryBounds = boundingRect(boundary);
  const minX = Math.min(start.x, end.x, boundaryBounds.x) - margin;
  const minY = Math.min(start.y, end.y, boundaryBounds.y) - margin;
  const maxX = Math.max(start.x, end.x, boundaryBounds.x + boundaryBounds.width) + margin;
  const maxY = Math.max(start.y, end.y, boundaryBounds.y + boundaryBounds.height) + margin;
  const cols = Math.max(2, Math.ceil((maxX - minX) / ROAD_ROUTE_CELL_M));
  const rows = Math.max(2, Math.ceil((maxY - minY) / ROAD_ROUTE_CELL_M));
  const toCell = (point) => ({
    col: Math.round((point.x - minX) / ROAD_ROUTE_CELL_M),
    row: Math.round((point.y - minY) / ROAD_ROUTE_CELL_M)
  });
  const toPoint = (col, row) => ({
    x: minX + col * ROAD_ROUTE_CELL_M,
    y: minY + row * ROAD_ROUTE_CELL_M
  });
  const startCell = toCell(start);
  const endCell = toCell(end);
  const cellKey = (col, row) => row * (cols + 1) + col;
  const startKey = cellKey(startCell.col, startCell.row);
  const endKey = cellKey(endCell.col, endCell.row);
  const walkableCache = new Uint8Array((cols + 1) * (rows + 1));
  const cellWalkable = (col, row) => {
    if (col < 0 || row < 0 || col > cols || row > rows) {
      return false;
    }
    const key = cellKey(col, row);
    const cached = walkableCache[key];
    if (cached !== 0) {
      return cached === 1;
    }
    const point = toPoint(col, row);
    const walkable = key === startKey || key === endKey || arePointsInsidePolygon([point], boundary) && !isBlocked(point);
    walkableCache[key] = walkable ? 1 : 2;
    return walkable;
  };
  const open = [];
  heapPush(open, { col: startCell.col, row: startCell.row, g: 0, f: 0 });
  const gScore = /* @__PURE__ */ new Map([[startKey, 0]]);
  const cameFrom = /* @__PURE__ */ new Map();
  const closed = /* @__PURE__ */ new Set();
  const heuristic = (col, row) => Math.hypot((col - endCell.col) * ROAD_ROUTE_CELL_M, (row - endCell.row) * ROAD_ROUTE_CELL_M);
  const maxNodes = Math.min(ROAD_ROUTE_MAX_NODES, (cols + 1) * (rows + 1));
  let visited = 0;
  while (open.length > 0 && visited < maxNodes) {
    const current = heapPop(open);
    const currentKey = cellKey(current.col, current.row);
    if (closed.has(currentKey)) {
      continue;
    }
    closed.add(currentKey);
    visited += 1;
    if (currentKey === endKey) {
      const cells = [currentKey];
      let cursor = currentKey;
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor);
        cells.unshift(cursor);
      }
      const rawPath = cells.map((key) => toPoint(key % (cols + 1), Math.floor(key / (cols + 1))));
      rawPath[0] = { ...start };
      rawPath[rawPath.length - 1] = { ...end };
      return simplifyRoutedPath(rawPath, isBlocked, grid);
    }
    for (let dCol = -1; dCol <= 1; dCol += 1) {
      for (let dRow = -1; dRow <= 1; dRow += 1) {
        if (dCol === 0 && dRow === 0) {
          continue;
        }
        const nextCol = current.col + dCol;
        const nextRow = current.row + dRow;
        if (!cellWalkable(nextCol, nextRow)) {
          continue;
        }
        const nextKey = cellKey(nextCol, nextRow);
        if (closed.has(nextKey)) {
          continue;
        }
        const distanceCost = ROAD_ROUTE_CELL_M * (dCol !== 0 && dRow !== 0 ? Math.SQRT2 : 1);
        const nextSlope = grid ? slopeAtPoint(grid, toPoint(nextCol, nextRow)) : 0;
        const stepCost = distanceCost * (1 + ROAD_SLOPE_COST_K * nextSlope);
        const tentative = current.g + stepCost;
        if (tentative >= (gScore.get(nextKey) ?? Infinity)) {
          continue;
        }
        gScore.set(nextKey, tentative);
        cameFrom.set(nextKey, currentKey);
        heapPush(open, { col: nextCol, row: nextRow, g: tentative, f: tentative + heuristic(nextCol, nextRow) });
      }
    }
  }
  return null;
}
function heapPush(heap, node) {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = index - 1 >> 1;
    if (heap[parent].f <= heap[index].f) {
      break;
    }
    const swap2 = heap[parent];
    heap[parent] = heap[index];
    heap[index] = swap2;
    index = parent;
  }
}
function heapPop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length === 0) {
    return top;
  }
  heap[0] = last;
  let index = 0;
  for (; ; ) {
    const left = index * 2 + 1;
    let smallest = index;
    if (left < heap.length && heap[left].f < heap[smallest].f) {
      smallest = left;
    }
    if (left + 1 < heap.length && heap[left + 1].f < heap[smallest].f) {
      smallest = left + 1;
    }
    if (smallest === index) {
      return top;
    }
    const swap2 = heap[smallest];
    heap[smallest] = heap[index];
    heap[index] = swap2;
    index = smallest;
  }
}
function segmentIsClear(a, b, isBlocked) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(length / 2));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    if (isBlocked({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) {
      return false;
    }
  }
  return true;
}
function simplifyRoutedPath(path, isBlocked, grid = null) {
  const simplified = [path[0]];
  let anchorIndex = 0;
  while (anchorIndex < path.length - 1) {
    let farthest = anchorIndex + 1;
    for (let index = path.length - 1; index > anchorIndex + 1; index -= 1) {
      if (!segmentIsClear(path[anchorIndex], path[index], isBlocked)) {
        continue;
      }
      if (grid) {
        const shortcutCost = segmentSlopeCost(path[anchorIndex], path[index], grid);
        let detourCost = 0;
        for (let k = anchorIndex; k < index; k += 1) {
          detourCost += segmentSlopeCost(path[k], path[k + 1], grid);
        }
        if (shortcutCost > detourCost * 1.05) {
          continue;
        }
        const shortcutMax = segmentMaxSlope(path[anchorIndex], path[index], grid);
        let detourMax = 0;
        for (let k = anchorIndex; k < index; k += 1) {
          detourMax = Math.max(detourMax, segmentMaxSlope(path[k], path[k + 1], grid));
        }
        if (shortcutMax > detourMax + ROAD_SLOPE_SHORTCUT_TOLERANCE) {
          continue;
        }
      }
      farthest = index;
      break;
    }
    simplified.push(path[farthest]);
    anchorIndex = farthest;
  }
  return simplified.map(roundPoint2);
}
function segmentMaxSlope(a, b, grid) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(length / 2));
  let max = 0;
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    max = Math.max(max, slopeAtPoint(grid, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }));
  }
  return max;
}
function straightSlopeIsGentle(a, b, grid) {
  if (!grid) {
    return true;
  }
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(length / 2));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const slope = slopeAtPoint(grid, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    if (slope > ROAD_SLOPE_STRAIGHT_MAX) {
      return false;
    }
  }
  return true;
}
function segmentSlopeCost(a, b, grid) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(length / 2));
  const segLength = length / steps;
  let cost = 0;
  for (let step = 0; step < steps; step += 1) {
    const t = (step + 0.5) / steps;
    const slope = slopeAtPoint(grid, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    cost += segLength * (1 + ROAD_SLOPE_COST_K * slope);
  }
  return cost;
}
function round1(value) {
  return Math.round(value * 10) / 10;
}
export {
  ADJUST_TARGETS,
  AREA_PER_PERSON_SQUARE_METERS,
  AiPlacementError,
  CANDIDATE_ANGLES_DEG,
  CORE_LABELS,
  DEFAULT_AREA_PER_PERSON_M2,
  DEFAULT_EARTHWORK_CONFIG,
  DEFAULT_PROJECT_COST_CONFIG,
  DEFAULT_ZONE_CAPACITY,
  FACILITY_CATALOG,
  FACILITY_CATEGORY_LABELS,
  GUARD_COVER_SPACING_M,
  GUARD_POST_FIXED_FLOORS,
  GUARD_POST_PERSONNEL,
  MAX_ENTRY_POINTS,
  MODULE_IDS,
  MODULE_LABELS,
  MODULE_WEIGHTS,
  PYEONG_TO_SQUARE_METERS,
  QUESTION_BANK,
  QUESTION_IDS,
  RECOMMENDED_AREA_PYEONG_PER_CAPACITY,
  SITE_AREA_PER_PERSON_SQUARE_METERS,
  UNIT_TEMPLATES,
  UNIT_TEMPLATE_LABELS,
  applyModuleAdjustment,
  applyQuestionAnswer,
  arePointsInsidePolygon,
  buildDifficultyGrid,
  buildEarthworkReselectionIssues,
  buildProgram,
  buildRequirementsResponseSchema,
  calculateLocalPolygonAreaSquareMeters,
  calculatePolygonOverlapAreaSquareMeters,
  closeLocalRing,
  computeEarthwork,
  computeProjectCost,
  createDefaultZoneProperties,
  createDesignRequirements,
  createDesignSystemPrompt,
  createRecommendedZoneDimensions,
  createZoneAreaMetrics,
  defaultModulesFor,
  delaunayEdges,
  difficultyForPolygon,
  difficultyForRect,
  difficultyGridToGeoJson,
  entryCenterOf,
  findBoundaryRoadCrossings,
  findFacilityTypeById,
  findQuestion,
  footprintTemplates,
  formatKrwShort,
  generatePlacement,
  getBoundingBox,
  getExternalRoadPoints,
  groupFacilitiesByCategory,
  isInterrogativeText,
  isPolygonInsidePolygon,
  lngLatToLocalMeters,
  localMetersToLngLat,
  mergeTurnRequirements,
  normalizeZoneProperties,
  normalizedElevationForRect,
  offsetPolygonOutward,
  polygonCentroid,
  polygonLngLatToLocalMeters,
  pruneRoadEdges,
  requestDesignTurn,
  resolveAutoPermitFeeKrw,
  resolveDesignTurn,
  rotatePolygon,
  routeRoadAroundObstacles,
  scalePolygonToArea,
  segmentIntersection,
  shouldSkipDetachedWelfare,
  slopeAtPoint,
  splitInfraUnit
};
