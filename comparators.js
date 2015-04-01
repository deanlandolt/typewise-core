//
// generic comparator implementations our types can use
//
var comparators = exports

//
// scalar comparisons
//
comparators.inequality = function (a, b) {
  return a < b ? -1 : ( a > b ? 1 : 0 )
}

comparators.difference = function (a, b) {
  return a - b
}

//
// generic comparators are higher order functions that return comparators
//
comparators.generic = {}

//
// element by element (comparison for list-like structures
//
comparators.generic.elementwise = function (compare, shortlex) {
  return function (a, b) {
    var aLength = a.length
    var bLength = b.length
    var difference

    //
    // short-circuit on length difference for shortlex semantics
    //
    if (shortlex && aLength !== bLength)
        return aLength - bLength

    for (var i = 0, length = Math.min(aLength, bLength); i < length; ++i) {
      if (difference = compare(a[i], b[i]))
        return difference
    }

    return aLength - bLength
  }
}

//
// field by field comparison of record-like structures
//
comparators.generic.fieldwise = function (compare, shortlex) {
  return function (a, b) {
    var aKeys = Object.keys(a)
    var bKeys = Object.keys(b)
    var aLength = aKeys.length
    var bLength = bKeys.length
    var difference

    //
    // short-circuit on length difference for shortlex semantics
    //
    if (shortlex && aLength !== bLength)
        return aLength - bLength

    for (var i = 0, length = Math.min(aLength, bLength); i < length; ++i) {
      //
      // first compare keys
      //
      if (difference = compare(aKeys[i], bKeys[i]))
        return difference

      //
      // then compare values
      //
      if (difference = compare(a[aKeys[i]], b[bKeys[i]]))
        return difference
    }

    return aLength - bLength
  }
}

//
// elementwise compare with inequality can be used for binary equality
//
comparators.bytewise = comparators.generic.elementwise(exports.inequality)

