import { NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  { path: '/affected-oils', label: '受影響油品' },
  { path: '/recall-products', label: '預防性下架' },
  { path: '/downstream-vendors', label: '下游業者' },
]

export default function Header() {
    const navigate = useNavigate();
    return (
        <header>
            <div
             onClick={() => navigate('/')} style={{ cursor: "pointer", fontSize: "1.3rem"}}>
                中聯油品案回收網
            </div>
            <div>
                <ul>
                    {NAV.map((item) => (
                        <li key={item.path}>
                            <NavLink to={item.path}>{item.label}</NavLink>
                        </li>
                    ))}
                </ul>
            </div>
        </header>
    )
}
