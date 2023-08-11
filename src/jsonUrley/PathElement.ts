
class PathElement {
  key: string
  typeHint?: string

  constructor(key: string, typeHint?: string) {
    this.key = key
    this.typeHint = typeHint
  }

  getTypedValue(value: string) {
    if (this.typeHint) {
      const fn = TYPE_HINTS[this.typeHint]
      return fn(value)
    }
    return getTypedValue(value)
  }
}

export default PathElement

export const parsePath = (path: string) => {
  const elements = []
  let currentIndex = 0
  let currentKey = []
  while (true) {
    const nextTilda = nextIndexOf(path, "~", currentIndex)
    const nextDot = nextIndexOf(path, ".", currentIndex)
    if (nextTilda < nextDot) {
      if (["~", "."].includes(path[nextTilda + 1])) {
        currentKey.push(path.substring(currentIndex, nextTilda))
        currentKey.push(path[nextTilda + 1])
        currentIndex = nextTilda + 2
      } else {
        currentKey.push(path.substring(currentIndex, nextTilda))
        elements.push(
          new PathElement(currentKey.join(""), path.substring(nextTilda + 1, nextDot))
        )
        currentKey.length = 0
        currentIndex = nextDot + 1
      }
    } else if (nextDot < nextTilda) {
      currentKey.push(path.substring(currentIndex, nextDot))
      elements.push(new PathElement(currentKey.join("")))
      currentKey.length = 0
      currentIndex = nextDot + 1
    } else {
      if (currentIndex < path.length){
        currentKey.push(path.substring(currentIndex, path.length))
      }
      if (currentKey.length) {
        elements.push(new PathElement(currentKey.join("")))
      }
      return elements
    }
  }
}

function nextIndexOf(path: string, sub: string, fromIndex: number) {
  const result = path.indexOf(sub, fromIndex)
  if (result < 0) {
    return path.length
  }
  return result
}


const TYPE_HINTS = {
  s: (value: string) => {
    return value
  },
  f: (value: string) => {
    const parsed = parseFloat(value)
    if (parsed.toString() != value){
      throw new Error(`not_float:${value}`)
    }
    return parsed
  },
  i: (value: string) => {
    const parsed = parseInt(value)
    if (parsed.toString() != value){
      throw new Error(`not_int:${value}`)
    }
    return parsed
  },
  b: (value: string) => {
    value = value.toLowerCase()
    if (["true", "1"].includes(value)){
      return true
    }
    if (["false", "0"].includes(value)){
      return false
    }
    throw new Error(`not_boolean:${value}`)
  },
  n: (value: string) => {
    if (value) {
      throw new Error(`not_empty:${value}`)
    }
    return null
  },
  a: (value: string) => {
    if (value) {
      throw new Error(`not_empty:${value}`)
    }
    return []
  },
  o: (value: string) => {
    if (value) {
      throw new Error(`not_empty:${value}`)
    }
    return {}
  }
}

function getTypedValue(value: string){
  if (value == "null") {
    return null
  }
  if (value == "true") {
    return true
  }
  if (value == "false") {
    return false
  }
  const result = parseFloat(value)
  if (result.toString() == value){
    return result
  }
  return value
}
