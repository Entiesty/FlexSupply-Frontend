import request from '@/utils/request'

export function uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    // 覆盖默认的 headers，告诉 axios 这是一个文件表单
    return request({
        url: '/common/file/upload',
        method: 'post',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}