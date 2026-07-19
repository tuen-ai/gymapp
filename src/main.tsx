import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Layout from './Layout.tsx'
import ExercisesPage from './pages/Exercises.tsx'
import ExerciseDetailPage from './pages/ExerciseDetail.tsx'
import GymPage from './pages/Gym.tsx'
import PlansPage from './pages/Plans.tsx'
import PlanEditPage from './pages/PlanEdit.tsx'
import WorkoutPage from './pages/Workout.tsx'
import HistoryPage from './pages/History.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <ExercisesPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'exercises/:id', element: <ExerciseDetailPage /> },
      { path: 'gym', element: <GymPage /> },
      { path: 'plans', element: <PlansPage /> },
      { path: 'plans/:id', element: <PlanEditPage /> },
      { path: 'workout', element: <WorkoutPage /> },
      { path: 'history', element: <HistoryPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
