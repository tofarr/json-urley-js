import PathElement, { parsePath } from './PathElement'

export type JsonType = boolean | number | string | JsonType[] | { [key: string]: JsonType; }

export const queryStrToJsonObj = (query: string) => {
    const params = new URLSearchParams(query)
    const result = queryParamsToJsonObj(params)
    return result
}

export const queryParamsToJsonObj = (params: URLSearchParams) => {
    const result = {}
    params.forEach((value, key) => {
      const path = parsePath(key)
      appendParam(path, value, result)
    })
    return result
}

function appendParam(path: PathElement[], value: string, result: JsonType){
    let parent = result
    for (let i = 0; i < path.length - 1; i++){
        const pathElement = path[i]
        if (pathElement.typeHint && pathElement.typeHint !== "a") {
            throw new Error(`invalid_element:${pathElement}`)
        }
        if (parent instanceof Array) {
            parent = appendParamToArray(pathElement, parent as JsonType[])
        } else if (typeof parent === 'object') {
            parent = appendParamToObj(pathElement, parent)
        } else {
            throw new Error(`path_mismatch:${pathElement}`)
        }
    }

    const pathElement = path[path.length-1]
    const typedValue = pathElement.getTypedValue(value)
    if (parent instanceof Array) {
        if (!["e", "n"].includes(pathElement.key)) {
            throw new Error(`path_mismatch:${pathElement}`)
        }
        parent.push(typedValue)
    } else if (typeof parent !== 'object') {
        throw new Error(`path_mismatch:${pathElement}`)
    } else if (pathElement.key in parent) {
        const existingValue = parent[pathElement.key]
        if (existingValue instanceof Array) {
            existingValue.push(typedValue)
        } else {
            parent[pathElement.key] = [existingValue, typedValue]
        }
    } else {
        parent[pathElement.key] = typedValue
    }
}

function appendParamToArray(pathElement: PathElement, parent: JsonType[]) {
    if (pathElement.key === "e" && parent.length) {
        return parent[parent.length-1]
    }
    if (["e", "n"].includes(pathElement.key)) {
        const child = (pathElement.typeHint === "a") ? [] : {}
        parent.push(child)
        return child
    }
    throw new Error(`path_mismatch:${pathElement}`)
}

function appendParamToObj(pathElement: PathElement, parent: { [key: string]: JsonType; }) {
    const { key } = pathElement
    if (key in parent) {
        return parent[key]
    }
    const child = (pathElement.typeHint === "a") ? [] : {}
    parent[key] = child
    return child
}


export const jsonObjToQueryParams = (jsonObj: JsonType) => {
    const result = new URLSearchParams()
    if (Object.keys(jsonObj).length) {
        generateQueryParams(jsonObj, [], false, result)
    }
    return result
}


export const jsonObjToQueryStr = (jsonObj: JsonType) => {
    const queryParams = jsonObjToQueryParams(jsonObj)
    let result = queryParams.toString()
    result = result.replaceAll('%7E', '~')
    return result
}


function generateQueryParams(jsonObj: JsonType, currentParam: string[], isNestedList: boolean, target: URLSearchParams) {
    if (jsonObj == null) {
        target.append(currentParam.join('.'), "null")
    } else if ((typeof jsonObj === "object") && !(jsonObj instanceof Array)) {
        if (Object.keys(jsonObj).length === 0) {
            target.append(currentParam.join('.') + "~o", "")
            return
        }
        for (let key in jsonObj) {
            const value = jsonObj[key]
            key = key.replaceAll("~", "~~").replaceAll(".", "~.")
            currentParam.push(key)
            generateQueryParams(value, currentParam, false, target)
            currentParam.pop()
        }
    } else if (jsonObj instanceof Array) {
        generateQueryParamsForList(jsonObj as JsonType[], currentParam, isNestedList, target)
    } else if (typeof jsonObj === 'boolean') {
        const key = currentParam.join(".")
        jsonObj = jsonObj ? "true" : "false"
        target.append(key, jsonObj)
    } else if (typeof jsonObj === 'number') {
        const key = currentParam.join(".")
        target.append(key, jsonObj.toString())
    } else if (typeof jsonObj === "string") {
        generateQueryParamsForStr(jsonObj, currentParam, target)
    } else {
        throw new Error(`unexpected_type:${jsonObj}`)
    }
}


function generateQueryParamsForList(jsonObj: JsonType[], currentParam: string[], isNestedList: boolean, target: URLSearchParams) {
    if (!jsonObj.length) {
        target.append(currentParam.join(".") + "~a", "")
        return
    }

    const hasNested = !!jsonObj.find(i => typeof i === 'object')
    const isSingleItemArray = jsonObj.length === 1

    if (!hasNested && !isNestedList && !isSingleItemArray) {
        // If there is nothing complicated going on, we can output
        // array items in the format item=1&item=2
        for (const item of jsonObj) {
            generateQueryParams(item, currentParam, false, target)
        }
        return
    }

    const itemIndex = currentParam.length
    currentParam[currentParam.length-1] += "~a"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrappedTarget = new URLListParamsWrapper(target, currentParam, itemIndex) as any as URLSearchParams
    for (const item of jsonObj) {
        currentParam.push("n")
        generateQueryParams(item, currentParam, true, wrappedTarget)
        currentParam.pop()
    }
}

function generateQueryParamsForStr(jsonObj: string, currentParam: string[], target: URLSearchParams) {
    let key = currentParam.join(".")
    if (["true", "false", "null"].includes(jsonObj)) {
        key += "~s"
    }
    if (!Number.isNaN(parseFloat(jsonObj))) {
      key += "~s"
    }
    target.append(key, jsonObj)
}

class URLListParamsWrapper {
  params: URLSearchParams
  path: string[]
  pathIndex: number

  constructor(params: URLSearchParams, path: string[], pathIndex: number) {
    this.params = params
    this.path = path
    this.pathIndex = pathIndex
  }

  append(key: string, value: string) {
    this.params.append(key, value)
    this.path[this.pathIndex] = "e"
    const item = this.path[this.pathIndex - 1]
    if (item.endsWith('~a')){
      this.path[this.pathIndex - 1] = item.substring(0, item.length - 2)
    }
  }
}
