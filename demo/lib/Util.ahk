Util_CreateLargeArray()
{
    arr := []
    Loop 1000
    {
        arr.push(A_Index)
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