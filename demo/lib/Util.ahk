Util_CreateLargeArray()
{
    arr := []
    Loop 1000
    {
        arr.push(A_Index)
    }
    return arr
}
Util_CreateGiantArray()
{
    arr := []
    Loop 500
    {
        arr.push(Util_CreateLargeArray())
    }
    return arr
}
Util_CreateMaxSizeArray()
{
    arr := []
    Loop 10000
    {
        arr.push(A_Index)
    }
    return arr
}