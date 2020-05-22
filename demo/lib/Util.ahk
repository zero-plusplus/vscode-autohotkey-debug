Util_CreateBigArray()
{
    arr := []
    Loop 10000
    {
        arr.push(A_Index)
    }
    return arr
}