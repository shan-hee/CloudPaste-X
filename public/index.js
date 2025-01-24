document.getElementById('refreshList').addEventListener('click', function() {
    // 添加旋转类
    this.classList.add('spinning');
    // 动画结束后移除类
    setTimeout(() => {
        this.classList.remove('spinning');
    }, 600);
    
    // 原有的刷新逻辑
    fetchStorageList();
});