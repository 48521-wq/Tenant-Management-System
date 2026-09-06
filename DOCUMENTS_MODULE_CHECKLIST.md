# Documents Module Checklist

This file documents the existing Documents option for the next repository push.
It does not run at runtime and does not change application behavior.

## Tenant Portal

1. The Documents navigation item is visible to a tenant.
2. The Documents page can be opened from the sidebar.
3. The upload button is shown when a rental request can accept documents.
4. The tenant can open the document upload dialog.
5. The ID Card upload control accepts image files.
6. The Police Certificate upload control accepts image files.
7. The selected ID Card image is previewed before submission.
8. The selected Police Certificate image is previewed before submission.
9. Both required documents must be present before submission.
10. A missing document displays a validation message.
11. A submitted request displays a review status.
12. A rejected request displays the rejection reason.
13. A rejected request can be submitted again.
14. An approved request displays the final approval state.
15. An expired request displays the deadline message.
16. The Documents page refreshes data from the API.
17. API errors are shown without breaking the dashboard.
18. The tenant cannot approve or reject documents.
19. The tenant can view the current document status.
20. The tenant can replace rejected documents.

## Landlord Portal

21. The Documents navigation item is visible to a landlord.
22. The Documents page can be opened from the sidebar.
23. Submitted tenant documents appear in the review list.
24. The tenant name is shown with the submission.
25. The tenant email is shown with the submission.
26. The related property is shown with the submission.
27. The ID Card preview can be opened.
28. The Police Certificate preview can be opened.
29. The submission timestamp is displayed when available.
30. A landlord can open the document verification dialog.
31. A landlord can enter a rejection reason.
32. A rejection reason is required before rejection.
33. A landlord can reject submitted documents.
34. A landlord can approve submitted documents.
35. Approval assigns the property to the tenant.
36. Rejection returns the request to the resubmission state.
37. The tenant receives the rejection reason.
38. The review list refreshes after approval.
39. The review list refreshes after rejection.
40. Unauthorized users cannot review documents.

## Admin Portal

41. The Documents Review page is available to an administrator.
42. Pending document submissions are listed.
43. Submitted document images can be previewed.
44. A rejection reason can be entered by the administrator.
45. The administrator can approve submitted documents.
46. The administrator can reject submitted documents.
47. The administrator can block a tenant when required.
48. The review list displays the current request status.
49. Empty review results display a clear empty state.
50. API failures display an error state.

## API Expectations

51. Tenant document submission uses the rental request API.
52. Two documents are required for submission.
53. Document verification requires an authenticated user.
54. Only the property landlord or an administrator can verify.
55. Verification accepts an approve or reject action.
56. Reject actions preserve the rejection reason.
57. Approve actions finalize the rental request.
58. Invalid actions return a client error.
59. Missing properties return a not-found response.
60. Authentication failures return an authorization response.

## Push Note

This checklist is documentation only.
It contains no executable code.
It does not add fake records.
It does not change the Documents page.
It does not change API routes.
It does not change database models.
It is included to document the existing module for repository review.
