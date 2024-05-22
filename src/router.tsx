import {createBrowserRouter} from "react-router-dom"
import LoginPage from "@/pages/Login.tsx"
import HomePage from "@/pages/HomePage.tsx"
import DashboardLayout from "./layout/Dashboard.layout"


export const Router = createBrowserRouter([
    {
        path:'dashboard',
        element:<DashboardLayout />,
        children:[{
            path:'home',
            element:<HomePage />

        }],

    },
    {
        path:'/login',
        element:<LoginPage />
    }
]);