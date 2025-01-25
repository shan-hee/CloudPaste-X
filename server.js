import 'dotenv/config';
import app from './src/index.js';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('\n=== 服务器启动完成 ===\n');
}); 