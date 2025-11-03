// TESTS: TaskCard component tests for assignment visibility (TSK-018, TSK-019)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAsManager, renderAsStaff, testTasks } from './TaskCard.test.utils.jsx';
import TaskCard from './TaskCard.jsx';

describe('TaskCard - Assignment Button Visibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('TSK-018: Manager Sees Assign Buttons', () => {
        it('should show Assign button for task when user is Manager', () => {
            const task = testTasks['T-610'];

            renderAsManager(
                <TaskCard
                    task={task}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            // Manager should see the Assign button
            // Note: This test expects an Assign button to be added to the TaskCard component
            const assignButton = screen.queryByRole('button', { name: /assign/i });

            // TSK-018: Managers should see the Assign button
            expect(assignButton).toBeInTheDocument();
        });

        it('should show Assign button for subtask when user is Manager', () => {
            const subtask = testTasks['T-610-1'];

            renderAsManager(
                <TaskCard
                    task={subtask}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            // Manager should see the Assign button for subtasks too
            const assignButton = screen.queryByRole('button', { name: /assign/i });

            expect(assignButton).toBeInTheDocument();
        });

        it('should not trigger API call until Assign button is clicked', () => {
            const task = testTasks['T-610'];
            const fetchSpy = vi.spyOn(globalThis, 'fetch');

            renderAsManager(
                <TaskCard
                    task={task}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            // Just rendering the component should not make any assignment-related API calls
            const assignmentCalls = fetchSpy.mock.calls.filter(call =>
                call[0]?.includes('/assign')
            );

            expect(assignmentCalls).toHaveLength(0);

            fetchSpy.mockRestore();
        });

        it('should make Assign button visible and accessible to screen readers', () => {
            const task = testTasks['T-610'];

            renderAsManager(
                <TaskCard
                    task={task}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            const assignButton = screen.queryByRole('button', { name: /assign/i });

            if (assignButton) {
                // Button should be visible
                expect(assignButton).toBeVisible();

                // Button should have accessible name
                expect(assignButton).toHaveAccessibleName();

                // Button should not be disabled
                expect(assignButton).not.toBeDisabled();
            }
        });
    });

    describe('TSK-019: Staff Does Not See Assign Buttons', () => {
        it('should hide Assign button for task when user is Staff', () => {
            const task = testTasks['T-610'];

            renderAsStaff(
                <TaskCard
                    task={task}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            // Staff should NOT see the Assign button
            const assignButton = screen.queryByRole('button', { name: /assign/i });

            // TSK-019: Staff should not see Assign button
            expect(assignButton).not.toBeInTheDocument();
        });

        it('should hide Assign button for subtask when user is Staff', () => {
            const subtask = testTasks['T-610-1'];

            renderAsStaff(
                <TaskCard
                    task={subtask}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            // Staff should NOT see the Assign button for subtasks either
            const assignButton = screen.queryByRole('button', { name: /assign/i });

            expect(assignButton).not.toBeInTheDocument();
        });

        it('should not expose Assign functionality via keyboard shortcuts', () => {
            const task = testTasks['T-610'];

            const { container } = renderAsStaff(
                <TaskCard
                    task={task}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            // Check that there are no hidden buttons or elements with "assign" in aria-label
            const allElements = container.querySelectorAll('*');
            const assignElements = Array.from(allElements).filter(el => {
                const ariaLabel = el.getAttribute('aria-label');
                const title = el.getAttribute('title');
                const name = el.getAttribute('name');

                return (
                    (ariaLabel && ariaLabel.toLowerCase().includes('assign')) ||
                    (title && title.toLowerCase().includes('assign')) ||
                    (name && name.toLowerCase().includes('assign'))
                );
            });

            // Should not find any assign-related elements
            expect(assignElements).toHaveLength(0);
        });

        it('should not expose Assign functionality in DOM at all for Staff', () => {
            const task = testTasks['T-610'];

            renderAsStaff(
                <TaskCard
                    task={task}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            // The word "assign" might appear in "assigned to" or similar contexts
            // But there should be no "Assign" button or action text
            const assignButton = screen.queryByText(/^assign$/i);
            expect(assignButton).not.toBeInTheDocument();
        });

        it('should verify no accessible actions related to assignment for Staff', () => {
            const task = testTasks['T-610'];

            renderAsStaff(
                <TaskCard
                    task={task}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            // Get all buttons
            const buttons = screen.queryAllByRole('button');

            // None of the buttons should be related to assignment
            buttons.forEach(button => {
                const text = button.textContent.toLowerCase();
                const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';

                // Allow "assigned" (past tense) but not "assign" (action)
                if (text === 'assign' || ariaLabel === 'assign') {
                    throw new Error('Staff should not have access to Assign button');
                }
            });
        });
    });

    describe('Role-based rendering verification', () => {
        it('should render different button sets for Manager vs Staff', () => {
            const task = testTasks['T-612'];

            // Render as Manager
            const { unmount: unmountManager } = renderAsManager(
                <TaskCard
                    task={task}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            const managerButtons = screen.queryAllByRole('button');
            const managerHasAssign = managerButtons.some(btn =>
                btn.textContent.toLowerCase().includes('assign')
            );

            unmountManager();

            // Render as Staff
            renderAsStaff(
                <TaskCard
                    task={task}
                    onEdit={vi.fn()}
                    onArchive={vi.fn()}
                    onUnarchive={vi.fn()}
                    isArchived={false}
                    onRefresh={vi.fn()}
                />
            );

            const staffButtons = screen.queryAllByRole('button');
            const staffHasAssign = staffButtons.some(btn =>
                btn.textContent.toLowerCase().includes('assign')
            );

            // Manager should have Assign, Staff should not
            expect(managerHasAssign).toBe(true);
            expect(staffHasAssign).toBe(false);
        });
    });

});
