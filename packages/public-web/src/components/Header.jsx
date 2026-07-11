import { useNavigate } from 'react-router-dom'

export default function Header() {
    const navigate = useNavigate();
    return (
        <header>
            <div
             onClick={() => navigate('/')} style={{ cursor: "pointer", fontSize: "1rem"}}>
                中聯油品案資訊專區
            </div>
            <div>
                <ul>
                    <li onClick={() => navigate('/upload')}>資料上傳</li>
                    <li onClick={() => navigate('/staging')}>資料審核</li>
                    <li onClick={() => navigate('/affected-oils')}>受影響油品編輯</li>
                </ul>
            </div>
        </header>
    )
}