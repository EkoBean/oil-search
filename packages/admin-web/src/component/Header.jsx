import { useNavigate } from 'react-router-dom'

export default function Header() {
    const navigate = useNavigate();
    return (
        <header>
            <div onClick={() => navigate('/')} style={{ cursor: "pointer", }}>
                油品資訊管理後台
            </div>
            <div>
                <ul>
                    <li onClick={() => navigate('/upload')}>資料上傳</li>
                    <li onClick={() => navigate('/staging')}>資料審核</li>
                    <li>受影響油品編輯</li>
                </ul>
            </div>
        </header>
    )
}