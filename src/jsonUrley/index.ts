import PathElement, { parsePath } from './PathElement'

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

function appendParam(path: PathElement[], value: string, result: any){
    let parent = result
    for (let i = 0; i < path.length - 1; i++){
        const pathElement = path[i]
        if (pathElement.typeHint && pathElement.typeHint !== "a") {
            throw new Error(`invalid_element:${pathElement}`)
        }
        if (parent instanceof Array) {
            parent = appendParamToArray(pathElement, parent)
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

function appendParamToArray(pathElement: PathElement, parent: any) {
    if (pathElement.key === "e" && parent) {
        return parent[parent.length-1]
    }
    if (["e", "n"].includes(pathElement.key)) {
        const child = (pathElement.typeHint === "a") ? [] : {}
        parent.push(child)
        return child
    }
    throw new Error(`path_mismatch:${pathElement}`)
}

function appendParamToObj(pathElement: PathElement, parent: any) {
    const { key } = pathElement
    if (key in parent) {
        return parent[key]
    }
    const child = (pathElement.typeHint === "a") ? [] : {}
    parent[key] = child
    return child
}


export const jsonObjToQueryParams = (jsonObj: any) => {
    const result = new URLSearchParams()
    if (Object.keys(jsonObj).length) {
        generateQueryParams(jsonObj, [], false, result)
    }
    return result
}


export const jsonObjToQueryStr = (jsonObj: any) => {
    const queryParams = jsonObjToQueryParams(jsonObj)
    const result = queryParams.toString()
    return result
}


function generateQueryParams(jsonObj: any, currentParam: string[], isNestedList: boolean, target: URLSearchParams) {
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
        generateQueryParamsForList(jsonObj, currentParam, isNestedList, target)
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


function generateQueryParamsForList(jsonObj: any, currentParam: string[], isNestedList: boolean, target: URLSearchParams) {
    if (!jsonObj.length) {
        target.append(currentParam.join(".") + "~a", "")
        return
    }

    const hasNested = !!jsonObj.find(i => typeof i === 'object')
    const isSingleItemArray = jsonObj.length === 1

    if (!hasNested && !isNestedList && !isSingleItemArray) {
        // If there is nothing complicated going on, we can output
        // array items in the format item=1&item=2
        for (const item in jsonObj) {
            generateQueryParams(item, currentParam, false, target)
        }
        return
    }

    const itemIndex = currentParam.length
    currentParam[currentParam.length-1] += "~a"
    let first = true
    for (const item of jsonObj) {
        currentParam.push("n")
        const subTarget = new URLSearchParams()
        generateQueryParams(item, currentParam, true, subTarget)
        subTarget.forEach((paramValue, paramName) => {
            target.append(paramName, paramValue)
            currentParam[itemIndex] = "e"
            if (first) {
                // Remove the repeat array definition to reduce verbosity
                const pathItem = currentParam[itemIndex - 1]
                if (pathItem.endsWith("~a")) {
                    currentParam[itemIndex - 1] = pathItem.substring(0, pathItem.length - 2)
                }
                first = false
            }
        })
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
